
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../_helpers";

export async function GET(_req: Request, { params }: { params: { id: string }}) {
  const { response } = await requireUser(); if (response) return response;
  const { rows } = await pool.query(`SELECT * FROM public.contest_entries WHERE contest_id=$1 ORDER BY created_at DESC LIMIT 200`, [params.id]);
  return NextResponse.json({ items: rows });
}
