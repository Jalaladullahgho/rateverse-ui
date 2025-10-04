
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../../_helpers";

export async function DELETE(_req: Request, { params }: { params: { id: string, prizeId: string }}) {
  const { response } = await requireUser(); if (response) return response;
  await pool.query(`DELETE FROM public.contest_prizes WHERE contest_id=$1 AND id=$2`, [params.id, params.prizeId]);
  return NextResponse.json({}, { status: 204 });
}
