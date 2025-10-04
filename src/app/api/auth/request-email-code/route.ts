export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
const bodySchema = z.object({ email: z.string().email() });
function gen(){ return Math.floor(100000+Math.random()*900000).toString(); }
export async function POST(req: Request){
  const json = await req.json().catch(()=>null);
  const parse = bodySchema.safeParse(json);
  if(!parse.success) return NextResponse.json({ error:"Invalid email" },{ status:400 });
  const { email } = parse.data;
  const code = gen();
  await pool.query(`INSERT INTO public.auth_magic_tokens(id,email,code,expires_at,created_at)
                    VALUES (gen_random_uuid(),$1,$2, now() + interval '15 minutes', now())`, [email, code]);
  return NextResponse.json({ ok:true, dev_code: code });
}




