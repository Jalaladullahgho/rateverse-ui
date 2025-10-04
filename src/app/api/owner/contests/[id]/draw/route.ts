
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../_helpers";

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const { response } = await requireUser(); if (response) return response;
  const b = await req.json();
  await pool.query(`SELECT public.publish_winners($1, $2, $3, $4)`, [params.id, b.seed_reveal, b.external_entropy || null, b.take || 1]);
  const { rows } = await pool.query(`SELECT count(*)::int AS c FROM public.contest_winners WHERE contest_id=$1 AND published=TRUE`, [params.id]);
  return NextResponse.json({ published: true, count: rows[0]?.c ?? 0 });
}
