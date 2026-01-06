import crypto from "crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db"; // عدّل إذا مختلف
import { decryptString } from "@/lib/messengerCrypto";

export const runtime = "nodejs";

function timingSafeEqualStr(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function verifySignature(rawBody: Buffer, signature: string | null) {
  if (!signature) return false;
  const secret = process.env.META_APP_SECRET ?? "";
  if (!secret) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  return timingSafeEqualStr(signature, expected);
}

function extractRef(evt: any): string | null {
  return evt?.referral?.ref || evt?.postback?.referral?.ref || null;
}

function extractQuickReplyPayload(evt: any): string | null {
  return evt?.message?.quick_reply?.payload || null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

async function sendToMessenger(pageToken: string, payload: any) {
  const res = await fetch(
    `https://graph.facebook.com/v20.0/me/messages?access_token=${encodeURIComponent(pageToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    console.error("Send API failed:", res.status, t);
  }
}

async function sendQuickReplies(pageToken: string, psid: string, text: string, options: { title: string; payload: string }[]) {
  return sendToMessenger(pageToken, {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: {
      text,
      quick_replies: options.map((o) => ({
        content_type: "text",
        title: o.title.slice(0, 20),
        payload: o.payload,
      })),
    },
  });
}

async function sendButtons(pageToken: string, psid: string, text: string, buttons: { title: string; url: string }[]) {
  return sendToMessenger(pageToken, {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "web_url",
            title: b.title.slice(0, 20),
            url: b.url,
          })),
        },
      },
    },
  });
}

export async function POST(req: Request) {
  const ab = await req.arrayBuffer();
  const rawBody = Buffer.from(ab);

  const sig = req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, sig)) {
    return new NextResponse("Bad signature", { status: 401 });
  }

  const body = JSON.parse(rawBody.toString("utf8"));
  if (body.object !== "page") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  for (const entry of body.entry ?? []) {
    const fbPageId = String(entry.id || "");
    for (const evt of entry.messaging ?? []) {
      const psid = String(evt.sender?.id || "");
      if (!fbPageId || !psid) continue;

      // 1) Get ref (slug)
      const ref = extractRef(evt); // ex: offer-arkg
      const quick = extractQuickReplyPayload(evt);
      const text = evt?.message?.text ? String(evt.message.text).trim() : null;

      // 2) load contest by ref AND ensure linked to this page
      // if ref not present, use thread mapping
      let contestId: string | null = null;
      let contestSlug: string | null = null;
      let contestTitle: string | null = null;
      let detailsUrl: string | null = null;

      if (ref) {
        const q = await pool.query(
          `
          select c.id, c.slug, c.title
            from public.contests c
            join public.messenger_pages mp on mp.contest_id=c.id and mp.fb_page_id=$2 and mp.is_active=true
           where c.slug=$1
           limit 1
          `,
          [ref, fbPageId]
        );
        if (q.rowCount === 0) {
          // page not configured or ref invalid for this page
          continue;
        }
        contestId = q.rows[0].id;
        contestSlug = q.rows[0].slug;
        contestTitle = q.rows[0].title;
        detailsUrl = `https://mazayago.com/offers/${contestSlug}`;

        // upsert thread
        await pool.query(
          `
          insert into public.messenger_threads (fb_page_id, psid, contest_id, stage, last_seen_at)
          values ($1,$2,$3,'AWAITING_ANSWER', now())
          on conflict (fb_page_id, psid)
          do update set contest_id=excluded.contest_id, stage='AWAITING_ANSWER', last_seen_at=now()
          `,
          [fbPageId, psid, contestId]
        );
      } else {
        const t = await pool.query(
          `select contest_id, stage, task_id from public.messenger_threads where fb_page_id=$1 and psid=$2 limit 1`,
          [fbPageId, psid]
        );
        if (t.rowCount > 0) contestId = t.rows[0].contest_id;
      }

      if (!contestId) continue;

      // 3) get page token for sending
      const tokRow = await pool.query(
        `select page_access_token_enc from public.messenger_pages where fb_page_id=$1 and is_active=true limit 1`,
        [fbPageId]
      );
      if (tokRow.rowCount === 0) continue;
      const pageToken = decryptString(tokRow.rows[0].page_access_token_enc);

      // 4) If ref just arrived and user hasn't answered yet -> ask first task
      if (ref && !quick && !text) {
        const task = await pool.query(
          `select id, kind, title from public.contest_tasks where contest_id=$1 order by "position" asc limit 1`,
          [contestId]
        );

        if (task.rowCount === 0) {
          await sendButtons(pageToken, psid, "افتح تفاصيل المسابقة من هنا 👇", [
            { title: "تفاصيل المسابقة", url: `https://mazayago.com/offers/${ref}` },
          ]);
          continue;
        }

        const taskId = task.rows[0].id as string;
        const kind = String(task.rows[0].kind || "").toUpperCase();
        const qText = String(task.rows[0].title || "اختر إجابتك");

        if (kind.includes("MCQ")) {
          const opts = await pool.query(
            `select id, label from public.contest_mcq_options where task_id=$1 order by "position" asc, id asc`,
            [taskId]
          );
          const quickReplies = opts.rows.slice(0, 13).map((r: any) => ({
            title: String(r.label),
            payload: `opt:${r.id}`, // نرسل ID
          }));

          await pool.query(
            `update public.messenger_threads set stage='AWAITING_ANSWER', task_id=$3, last_seen_at=now() where fb_page_id=$1 and psid=$2`,
            [fbPageId, psid, taskId]
          );

          await sendQuickReplies(pageToken, psid, qText, quickReplies);
          continue;
        }

        // fallback: text answer
        await pool.query(
          `update public.messenger_threads set stage='AWAITING_ANSWER', task_id=$3, last_seen_at=now() where fb_page_id=$1 and psid=$2`,
          [fbPageId, psid, taskId]
        );

        await sendToMessenger(pageToken, {
          recipient: { id: psid },
          messaging_type: "RESPONSE",
          message: { text: `${qText}\nاكتب إجابتك الآن:` },
        });
        continue;
      }

      // 5) Answer handling (quick reply OR text)
      const thread = await pool.query(
        `select contest_id, task_id from public.messenger_threads where fb_page_id=$1 and psid=$2 limit 1`,
        [fbPageId, psid]
      );
      const taskId = thread.rowCount ? (thread.rows[0].task_id as string | null) : null;

      // avoid duplicates
      const exists = await pool.query(
        `select id from public.messenger_entries where contest_id=$1 and fb_page_id=$2 and psid=$3 limit 1`,
        [contestId, fbPageId, psid]
      );
      if (exists.rowCount > 0) {
        await sendButtons(pageToken, psid, "أنت مسجّل بالفعل ✅", [
          { title: "تفاصيل المسابقة", url: `https://mazayago.com/offers/${ref ?? ""}`.replace(/\/$/, "") || "https://mazayago.com/offers" },
        ]);
        continue;
      }

      let mcqOptionId: string | null = null;
      let answerText: string | null = null;
      let isCorrect: boolean | null = null;

      if (quick && quick.startsWith("opt:")) {
        mcqOptionId = quick.slice(4);
        // get correctness
        const oc = await pool.query(
          `select is_correct from public.contest_mcq_options where id=$1 limit 1`,
          [mcqOptionId]
        );
        if (oc.rowCount) isCorrect = !!oc.rows[0].is_correct;
      } else if (text) {
        answerText = text;
      } else {
        continue;
      }

      await pool.query(
        `
        insert into public.messenger_entries (contest_id, fb_page_id, psid, task_id, answer_text, mcq_option_id, is_correct, raw_event)
        values ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [contestId, fbPageId, psid, taskId, answerText, mcqOptionId, isCorrect, evt]
      );

      await sendToMessenger(pageToken, {
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { text: "تم تسجيل مشاركتك ✅" },
      });

      // details + (optional) claim later
      await sendButtons(pageToken, psid, "روابط مهمة 👇", [
        { title: "تفاصيل المسابقة", url: `https://mazayago.com/offers/${ref ?? ""}`.replace(/\/$/, "") || "https://mazayago.com/offers" },
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
