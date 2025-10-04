
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../../_helpers";

export async function DELETE(_req: Request, { params }:{ params: { id: string, userId: string }}){
  const { response } = await requireUser(); if (response) return response;
  await pool.query(`DELETE FROM public.contest_referees WHERE contest_id=$1 AND user_id=$2`, [params.id, params.userId]);
  return NextResponse.json({}, { status: 204 });
}
