export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

const schema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  country: z.string().length(2).optional(),
  phone: z.string().optional(),
});

function gen(){ return Math.floor(100000+Math.random()*900000).toString(); }

export async function POST(req: Request){
  const json = await req.json().catch(()=>null);
  const p = schema.safeParse(json);
  if(!p.success) return NextResponse.json({ error:"Invalid data" }, { status:400 });
  const { fullName, email, country, phone } = p.data;

  let userId: string | null = null;
  if(email){
    const u = await pool.query(`SELECT id FROM public.users WHERE email=$1`, [email]);
    if(u.rowCount){
      userId = u.rows[0].id;
      await pool.query(
        `UPDATE public.users
           SET country = COALESCE($2,country),
               phone   = COALESCE($3,phone),
               full_name = COALESCE($4,full_name),
               updated_at = now()
         WHERE id=$1`,
        [userId, country || null, phone || null, fullName || null]
      );
    } else {
      const ins = await pool.query(
        `INSERT INTO public.users(id,email,phone,country,full_name,status,created_at,updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', now(), now())
         RETURNING id`,
        [email, phone || null, country || null, fullName || null]
      );
      userId = ins.rows[0].id;
    }
  } else if(phone){
    const u = await pool.query(`SELECT id FROM public.users WHERE phone=$1`, [phone]);
    if(u.rowCount){
      userId = u.rows[0].id;
      await pool.query(
        `UPDATE public.users
           SET country = COALESCE($2,country),
               full_name = COALESCE($3,full_name),
               updated_at = now()
         WHERE id=$1`,
        [userId, country || null, fullName || null]
      );
    } else {
      const ins = await pool.query(
        `INSERT INTO public.users(id,phone,country,full_name,status,created_at,updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'active', now(), now())
         RETURNING id`,
        [phone, country || null, fullName || null]
      );
      userId = ins.rows[0].id;
    }
  } else {
    return NextResponse.json({ error:"Email or phone is required" }, { status:400 });
  }

  const code = gen();
  if(email){
    await pool.query(
      `INSERT INTO public.auth_magic_tokens(id,email,code,expires_at,created_at)
       VALUES (gen_random_uuid(),$1,$2, now() + interval '15 minutes', now())`,
      [email, code]
    );
  } else if(phone){
    await pool.query(
      `INSERT INTO public.auth_sms_codes(id,phone,code,expires_at,created_at)
       VALUES (gen_random_uuid(),$1,$2, now() + interval '15 minutes', now())`,
      [phone, code]
    );
  }

  return NextResponse.json({ ok:true, dev_code: code });
}




