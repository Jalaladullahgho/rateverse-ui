export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: Request){
  const form = await req.formData();
  const files = form.getAll("files") as File[];

  if(!files || files.length===0){
    return NextResponse.json({ error:"No files" }, { status:400 });
  }

  const out: string[] = [];
  for(const f of files){
    const bytes = await f.arrayBuffer();
    const buf = Buffer.from(bytes);
    const ext = path.extname(f.name) || ".png";
    const fname = `${randomUUID()}${ext}`;
    const target = path.join(process.cwd(), "public", "uploads", fname);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buf);
    out.push(`/uploads/${fname}`);
  }
  return NextResponse.json({ ok:true, urls: out });
}




