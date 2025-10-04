export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "";
  const q = searchParams.get("q") || "";

  const { rows } = await pool.query(`
    WITH ec AS (
      SELECT service_node_id, category_id FROM public.effective_node_categories_v
    )
    SELECT
      root.id   AS root_id,
      root.name_en AS root_name,
      sub.id    AS sub_id,
      sub.name_en AS sub_name,
      COALESCE(array_agg(DISTINCT sn.name) FILTER (WHERE sn.id IS NOT NULL), '{}') AS nodes
    FROM public.categories root
    LEFT JOIN public.categories sub ON sub.parent_id = root.id AND sub.active = TRUE
    LEFT JOIN ec ON ec.category_id = sub.id
    LEFT JOIN public.service_nodes sn ON sn.id = ec.service_node_id
      AND ($1 = '' OR sn.country = $1)
      AND ($2 = '' OR sn.name ILIKE '%'||$2||'%')
    WHERE root.parent_id IS NULL AND root.active = TRUE
    GROUP BY root.id, root.name_en, sub.id, sub.name_en
    ORDER BY root.name_en, sub.name_en
  `, [country, q]);

  const groups: any = {};
  for(const r of rows){
    if(!groups[r.root_id]) groups[r.root_id] = { root_id: r.root_id, root_name: r.root_name, children: [] };
    if(r.sub_id) groups[r.root_id].children.push({ sub_id: r.sub_id, sub_name: r.sub_name, nodes: r.nodes });
  }
  return NextResponse.json({ groups });
}




