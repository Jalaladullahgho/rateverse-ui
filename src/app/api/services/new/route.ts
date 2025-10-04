export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { slugify } from "@/lib/slug";

export async function POST(req: Request){
  const user = await currentUser();
  if(!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const ct = req.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await req.json() : Object.fromEntries(await (await req.formData()).entries());

  const display_name = String(body.display_name || "").trim();
  if(!display_name) return NextResponse.json({ error:"Display name is required" }, { status:400 });
  const slugBase = slugify(body.slug || display_name);
  const short_description = String(body.short_description || "").slice(0, 240);

  const logo_url   = body.logo_url   ? String(body.logo_url)   : null;
  const avatar_url = body.avatar_url ? String(body.avatar_url) : null;
  const cover_url  = body.cover_url  ? String(body.cover_url)  : null;

  // meta_json (socials)
  const meta_json: any = {};
  ["website","facebook","instagram","twitter","tiktok","youtube","whatsapp","phone","email"].forEach(k=>{
    const v = (body as any)[k];
    if(v) meta_json[k] = String(v);
  });

  // location
  const node_name = String(body.node_name || display_name);
  const address   = String(body.address || "");
  const city      = String(body.city || "");
  const country   = String(body.country || "");
  const geo_lat   = body.geo_lat ? Number(body.geo_lat) : null;
  const geo_lng   = body.geo_lng ? Number(body.geo_lng) : null;

  // categories (slugs)
  let category_slugs: string[] = [];
  try {
    category_slugs = Array.isArray(body.category_slugs) ? body.category_slugs.map(String) :
                     (body.category_slugs ? String(body.category_slugs).split(",").map((s:string)=>s.trim()).filter(Boolean) : []);
  } catch { category_slugs = []; }

  // gallery (urls)
  let gallery_urls: string[] = [];
  try {
    gallery_urls = Array.isArray(body.gallery_urls) ? body.gallery_urls.map(String) :
                   (body.gallery_urls ? String(body.gallery_urls).split(",").map((s:string)=>s.trim()).filter(Boolean) : []);
  } catch { gallery_urls = []; }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // unique slug
    let slug = slugBase || "service";
    let i = 0;
    // eslint-disable-next-line no-constant-condition
    while(true){
      const { rows } = await client.query(`SELECT 1 FROM public.services WHERE slug=$1 LIMIT 1`, [slug]);
      if(!rows[0]) break;
      i++;
      slug = `${slugBase}-${i}`;
    }

    // insert service
    const svcIns = await client.query(
  `INSERT INTO public.services(
     owner_user_id, display_name, slug, verified, status,
     logo_url, avatar_url, cover_url, short_description, meta_json
   )
   VALUES ($1,$2,$3,false,'active',$4,$5,$6,$7,$8)
   RETURNING id, slug`,
  [user.id, display_name, slug, logo_url, avatar_url, cover_url, short_description || null, meta_json]
);
    const serviceId = svcIns.rows[0].id;

    // insert first node
    const nodeIns = await client.query(
      `INSERT INTO public.service_nodes(service_id, kind, name, active, address, city, country, geo_lat, geo_lng)
       VALUES ($1,'branch',$2,true,$3,$4,$5,$6,$7)
       RETURNING id`,
      [serviceId, node_name, address || null, city || null, country || null, geo_lat, geo_lng]
    );
    const nodeId = nodeIns.rows[0].id;

    // categories mapping
    if(category_slugs.length){
      const cats = await client.query(
        `SELECT id, slug FROM public.categories WHERE slug = ANY($1) AND active=true`,
        [category_slugs]
      );
      for(const c of cats.rows){
        await client.query(
          `INSERT INTO public.service_categories(service_id, category_id)
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [serviceId, c.id]
        );
      }
    }

    // gallery -> service_media
    if(gallery_urls.length){
      for(const u of gallery_urls){
        await client.query(
          `INSERT INTO public.service_media(service_id, url, kind) VALUES ($1,$2,'image')`,
          [serviceId, u]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok:true, service_id: serviceId, service_slug: slug, node_id: nodeId });
  } catch(e:any){
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({ error: "Failed to create service" }, { status:500 });
  } finally {
    client.release();
  }
}




