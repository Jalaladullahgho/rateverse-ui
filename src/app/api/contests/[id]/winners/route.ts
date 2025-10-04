
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string }}) {
  const { rows } = await pool.query(`SELECT * FROM public.contest_winners WHERE contest_id=$1 ORDER BY decided_at DESC`, [params.id]);
  return NextResponse.json(rows);
}
