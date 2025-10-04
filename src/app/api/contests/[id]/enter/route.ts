
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const { rows } = await pool.query(`
    INSERT INTO public.contest_entries (contest_id, user_id, entry_type, task_id, round_id, answer_text, mcq_option_id, code_hash, asset_url, evidence_image_url, status)
    VALUES ($1,$2,$3::public.contest_type,$4,$5,$6,$7,$8,$9,$10,'PENDING')
    RETURNING *
  `, [params.id, u.id, b.entry_type, b.task_id || null, b.round_id || null, b.answer_text || null, b.mcq_option_id || null, b.code_hash || null, b.asset_url || null, b.evidence_image_url || null]);
  return NextResponse.json(rows[0], { status: 201 });
}
