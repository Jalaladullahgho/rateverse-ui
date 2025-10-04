
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../_helpers";

export async function GET(_req: Request, { params }: { params: { id: string }}) {
  const { response } = await requireUser(); if (response) return response;
  const { rows } = await pool.query(`SELECT * FROM public.contests WHERE id=$1`, [params.id]);
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: Request, { params }: { params: { id: string }}) {
  const { response } = await requireUser(); if (response) return response;
  const b = await req.json();
  const { rows } = await pool.query(`
    UPDATE public.contests SET
      title=COALESCE($2,title),
      description=COALESCE($3,description),
      branding_theme=COALESCE($4,branding_theme),
      selection=COALESCE($5::public.selection_method,selection),
      starts_at=COALESCE($6,starts_at),
      ends_at=COALESCE($7,ends_at),
      max_winners=COALESCE($8,max_winners),
      require_receipt=COALESCE($9,require_receipt),
      per_user_limit=COALESCE($10,per_user_limit),
      geo_restrictions=COALESCE($11,geo_restrictions),
      eligibility_json=COALESCE($12,eligibility_json),
      rules_json=COALESCE($13,rules_json),
      prize_summary=COALESCE($14,prize_summary),
      public_randomness_source=COALESCE($15,public_randomness_source),
      visibility=COALESCE($16,visibility),
      updated_at=now()
    WHERE id=$1
    RETURNING *
  `, [params.id, b.title, b.description, b.branding_theme, b.selection, b.starts_at, b.ends_at, b.max_winners, b.require_receipt,
       b.per_user_limit, b.geo_restrictions, b.eligibility_json, b.rules_json, b.prize_summary, b.public_randomness_source, b.visibility]);
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
