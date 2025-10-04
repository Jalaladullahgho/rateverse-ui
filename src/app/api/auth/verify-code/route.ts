export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies, headers } from "next/headers";

function isEmail(x: string){ return x.includes("@"); }
function normalizePhone(x: string){ return x.replace(/[^\d+]/g, ""); }

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=> ({}));
    let { identifier, code } = body || {};
    if(!identifier || !code){
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    identifier = String(identifier).trim();
    code = String(code).trim();

    let userId: string | null = null;

    if(isEmail(identifier)){
      // ØªØ­Ù‚Ù‚ Ù…Ù† ÙƒÙˆØ¯ Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„
      const { rows } = await pool.query(
        `SELECT id, email, expires_at, used_at
           FROM public.auth_magic_tokens
          WHERE email = $1 AND code = $2
          ORDER BY created_at DESC
          LIMIT 1`,
        [identifier, code]
      );
      const row = rows[0];
      if(!row) return NextResponse.json({ error:"invalid_code" }, { status: 400 });
      if(row.used_at) return NextResponse.json({ error:"code_used" }, { status: 400 });
      if(new Date(row.expires_at) < new Date()) return NextResponse.json({ error:"code_expired" }, { status: 400 });

      // Ø¥ÙŠØ¬Ø§Ø¯/Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…
      const u = await pool.query(`SELECT id FROM public.users WHERE email=$1 LIMIT 1`, [identifier]);
      if(u.rows.length){ userId = u.rows[0].id; }
      else{
        const ins = await pool.query(
          `INSERT INTO public.users(email, status) VALUES($1,'active') RETURNING id`,
          [identifier]
        );
        userId = ins.rows[0].id;
      }

      // ØªØ¹Ù„ÙŠÙ… Ø§Ù„ÙƒÙˆØ¯ ÙƒÙ…Ø³ØªØ¹Ù…Ù„
      await pool.query(`UPDATE public.auth_magic_tokens SET used_at=now() WHERE id=$1`, [row.id]);
    }else{
      // ØªØ­Ù‚Ù‚ Ù…Ù† ÙƒÙˆØ¯ SMS
      const phone = normalizePhone(identifier);
      const { rows } = await pool.query(
        `SELECT id, phone, expires_at, used_at
           FROM public.auth_sms_codes
          WHERE phone = $1 AND code = $2
          ORDER BY created_at DESC
          LIMIT 1`,
        [phone, code]
      );
      const row = rows[0];
      if(!row) return NextResponse.json({ error:"invalid_code" }, { status: 400 });
      if(row.used_at) return NextResponse.json({ error:"code_used" }, { status: 400 });
      if(new Date(row.expires_at) < new Date()) return NextResponse.json({ error:"code_expired" }, { status: 400 });

      const u = await pool.query(`SELECT id FROM public.users WHERE phone=$1 LIMIT 1`, [phone]);
      if(u.rows.length){ userId = u.rows[0].id; }
      else{
        const ins = await pool.query(
          `INSERT INTO public.users(phone, status) VALUES($1,'active') RETURNING id`,
          [phone]
        );
        userId = ins.rows[0].id;
      }

      await pool.query(`UPDATE public.auth_sms_codes SET used_at=now() WHERE id=$1`, [row.id]);
    }

    // Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¬Ù„Ø³Ø© + Ø§Ù„ÙƒÙˆÙƒÙŠ
    const tokenRes = await pool.query(
      `INSERT INTO public.user_sessions(user_id, token, user_agent, ip, expires_at)
       VALUES ($1, gen_random_uuid(), $2, $3, now() + interval '30 days')
       RETURNING token`,
      [
        userId,
        headers().get("user-agent") || null,
        (headers().get("x-forwarded-for") || "").split(",")[0] || null
      ]
    );
    const token = tokenRes.rows[0].token;

    // ÙƒÙˆÙƒÙŠ rv_session
    const c = cookies();
    c.set("rv_session", String(token), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 ÙŠÙˆÙ…
    });

    return NextResponse.json({ ok:true });
  }catch(e:any){
    return NextResponse.json({ error:"server_error", detail:String(e?.message||e) }, { status: 500 });
  }
}




