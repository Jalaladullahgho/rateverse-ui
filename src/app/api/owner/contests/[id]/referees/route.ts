
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/app/api/_helpers";


export async function GET(_req: Request, { params }:{ params: { id: string }}){
  const { response } = await requireUser(); if (response) return response;
  const { rows } = await pool.query(`SELECT user_id, role, created_at FROM public.contest_referees WHERE contest_id=$1 ORDER BY created_at DESC`, [params.id]);
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request, { params }:{ params: { id: string }}){
  const { response } = await requireUser(); if (response) return response;
  const b = await req.json();
  const { rows } = await pool.query(`INSERT INTO public.contest_referees (contest_id, user_id, role) VALUES ($1,$2,$3) RETURNING user_id, role, created_at`, [params.id, b.user_id, b.role || 'JUDGE']);
  return NextResponse.json(rows[0], { status: 201 });
}
