export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(`SELECT * FROM public.contests WHERE visibility='public' ORDER BY starts_at DESC LIMIT 100`);
  return NextResponse.json({ items: rows });
}




