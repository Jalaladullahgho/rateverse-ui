
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/app/api/_helpers";


export async function POST(req: Request, { params }:{ params: { id: string, entryId: string }}){
  const { response } = await requireUser(); if (response) return response;
  const b = await req.json();
  const status = ['CORRECT','INCORRECT','DISQUALIFIED','NEEDS_REVIEW','PENDING'].includes(b.status)? b.status : 'NEEDS_REVIEW';
  await pool.query(`UPDATE public.contest_entries SET status=$2 WHERE id=$1`, [params.entryId, status]);
  return NextResponse.json({ ok: true });
}
