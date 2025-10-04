export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req:Request){
  const user = await currentUser();
  if(!user) return NextResponse.json({ error:"unauthorized" }, { status:401 });

  let payload:any = {};
  const ct = (req.headers.get("content-type")||"").toLowerCase();
  if(ct.includes("application/json")){
    payload = await req.json();
  }else{
    const fd = await req.formData();
    payload.full_name = fd.get("full_name") || undefined;
    payload.country = fd.get("country") || undefined;
    payload.avatar_url = fd.get("avatar_url") || undefined;
    payload.private_profile = fd.get("private_profile") ? true : undefined;
    payload.display_name = fd.get("display_name") || undefined;
  }

  const fields:string[] = []; const values:any[] = [];
  function set(name:string, val:any){ if(val!==undefined){ fields.push(`${name}=$${fields.length+1}`); values.push(val); } }
  set("full_name", payload.full_name);
  set("country", payload.country);
  set("avatar_url", payload.avatar_url);
  set("private_profile", payload.private_profile);
  set("display_name", payload.display_name);

  if(!fields.length) return NextResponse.json({ ok:true });

  values.push(user.id);
  await pool.query(`UPDATE public.users SET ${fields.join(", ")}, updated_at=now() WHERE id=$${values.length}`, values);
  return NextResponse.json({ ok:true });
}




