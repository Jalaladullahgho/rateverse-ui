
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../_helpers";

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const { response } = await requireUser(); if (response) return response;
  const b = await req.json();
  const { rows } = await pool.query(`
    INSERT INTO public.contest_prizes (contest_id, type, name, quantity, amount, currency, voucher_template_id, metadata)
    VALUES ($1, $2::public.prize_type, $3, $4, $5, $6, $7, $8) RETURNING *
  `, [params.id, b.type, b.name, b.quantity, b.amount || null, b.currency || null, b.voucher_template_id || null, b.metadata || null]);
  return NextResponse.json(rows[0], { status: 201 });
}
