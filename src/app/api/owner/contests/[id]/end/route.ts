import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../_helpers";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser(); if (response) return response;
  await pool.query(`UPDATE public.contests SET status='ENDED' WHERE id=$1`, [params.id]);
  return NextResponse.json({ ok: true });
}