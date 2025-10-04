export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(req: Request){
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if(!file) return NextResponse.json({ error:"No file" }, { status:400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const dir = path.join(process.cwd(), "public", "uploads", new Date().toISOString().slice(0,10));
  await fs.mkdir(dir, { recursive: true });
  const fname = Date.now()+"-"+(file.name||"upload").replace(/[^a-zA-Z0-9_.-]/g,"_");
  await fs.writeFile(path.join(dir, fname), buffer);
  return NextResponse.json({ url: "/uploads/"+new Date().toISOString().slice(0,10)+"/"+fname });
}




