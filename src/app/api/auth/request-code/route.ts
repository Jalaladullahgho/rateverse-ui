export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

const schema = z.object({ identifier: z.string().min(3) });

function gen(){ return Math.floor(100000+Math.random()*900000).toString(); }

export async function POST(req: Request){
  const json = await req.json().catch(()=>null);
  const p = schema.safeParse(json);
  if(!p.success) return NextResponse.json({ error:"Invalid input" }, { status:400 });
  const { identifier } = p.data;
  const code = gen();

  if(identifier.includes("@")){
    await pool.query(
      `INSERT INTO public.auth_magic_tokens(id,email,code,expires_at,created_at)
       VALUES (gen_random_uuid(),$1,$2, now() + interval '15 minutes', now())`,
      [identifier, code]
    );
  } else {
    await pool.query(
      `INSERT INTO public.auth_sms_codes(id,phone,code,expires_at,created_at)
       VALUES (gen_random_uuid(),$1,$2, now() + interval '15 minutes', now())`,
      [identifier, code]
    );
  }
  return NextResponse.json({ ok:true, dev_code: code });
}




