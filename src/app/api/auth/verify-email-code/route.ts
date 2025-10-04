export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";
const bodySchema = z.object({ email: z.string().email(), code: z.string().min(6).max(6) });
export async function POST(req: Request){
  const json = await req.json().catch(()=>null);
  const parse = bodySchema.safeParse(json);
  if(!parse.success) return NextResponse.json({ error:"Invalid data" },{ status:400 });
  const { email, code } = parse.data;
  const { rows } = await pool.query(
    `SELECT id FROM public.auth_magic_tokens WHERE email=$1 AND code=$2 AND used_at IS NULL AND expires_at>now()
     ORDER BY created_at DESC LIMIT 1`, [email, code]);
  if(!rows[0]) return NextResponse.json({ error:"Invalid or expired code" },{ status:400 });
  await pool.query(`UPDATE public.auth_magic_tokens SET used_at=now() WHERE id=$1`, [rows[0].id]);
  const u = await pool.query(`SELECT id FROM public.users WHERE email=$1 LIMIT 1`, [email]);
  let userId = u.rows[0]?.id;
  if(!userId){
    const ins = await pool.query(
      `INSERT INTO public.users(id,email,status,created_at,updated_at)
       VALUES (gen_random_uuid(),$1,'active',now(),now()) RETURNING id`, [email]);
    userId = ins.rows[0].id;
  }
  await createSession(userId);
  return NextResponse.json({ ok:true });
}




