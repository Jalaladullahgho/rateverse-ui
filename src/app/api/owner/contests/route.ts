export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function GET(req: Request) {
  const { response } = await requireUser(); if (response) return response;
  const { searchParams } = new URL(req.url);
  const owner_kind = searchParams.get("owner_kind");
  const owner_ref_id = searchParams.get("owner_ref_id");
  const { rows } = await pool.query(`
    SELECT * FROM public.contests
    WHERE ($1::text IS NULL OR owner_kind = $1::text::public.owner_kind)
      AND ($2::uuid IS NULL OR owner_ref_id = $2::uuid)
    ORDER BY created_at DESC
    LIMIT 100
  `, [owner_kind, owner_ref_id]);
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(); if (response) return response;
  const b = await req.json();
  const { rows } = await pool.query(`
    INSERT INTO public.contests
      (owner_kind, owner_ref_id, created_by_user_id, owner_service_id, slug, title, description, branding_theme,
       type, selection, starts_at, ends_at, max_winners, require_receipt, per_user_limit, geo_restrictions,
       eligibility_json, rules_json, prize_summary, public_randomness_source, status, visibility)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::public.contest_type,$10::public.selection_method,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'DRAFT',$21)
    RETURNING *
  `, [
    b.owner_kind, b.owner_ref_id, user.id, b.owner_service_id || null, b.slug, b.title, b.description || null,
    b.branding_theme || null, b.type, b.selection, b.starts_at, b.ends_at, b.max_winners || null, !!b.require_receipt,
    b.per_user_limit ?? 1, b.geo_restrictions || null, b.eligibility_json || null, b.rules_json || null, b.prize_summary || null,
    b.public_randomness_source || null, b.visibility || 'public'
  ]);
  return NextResponse.json(rows[0], { status: 201 });
}




