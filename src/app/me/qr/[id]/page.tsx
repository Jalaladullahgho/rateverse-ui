import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";
import SectionCard from "@/components/me/SectionCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

function qrlink(base:string, token:string, node:string){
  const url = `${base}/r?token=${encodeURIComponent(token)}&n=${encodeURIComponent(node)}`;
  const googleQR = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chld=H|0&chl=${encodeURIComponent(url)}`;
  return { url, img: googleQR };
}

export default async function QRPage({ params }:{ params:{ id:string } }){
  const u = await currentUser();
  if(!u) return <div className="text-slate-500">Sign in required.</div>;
  const { rows } = await pool.query(`
    SELECT sn.id, sn.name, s.display_name, s.owner_user_id
    FROM public.service_nodes sn JOIN public.services s ON s.id=sn.service_id
    WHERE sn.id=$1
  `, [params.id]);
  const node = rows[0];
  if(!node || node.owner_user_id !== u?.id) return <div className="text-slate-500">Not found</div>;

  // ensure a qr token exists (create if not)
  const { rows:tok } = await pool.query(`
    WITH existing AS (
      SELECT rs.id FROM public.review_sessions rs
      WHERE rs.service_node_id=$1 AND rs.origin='qr' AND rs.expires_at > now()
      LIMIT 1
    ), ins AS (
      SELECT (public.create_qr_session($1,$2,365,1000000)).* WHERE NOT EXISTS(SELECT 1 FROM existing)
    )
    SELECT * FROM ins
  `, [node.id, u.id]);

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const token = tok[0]?.token ?? "qr-token";
  const q = qrlink(base, token, node.id);

  return (
    <div className="space-y-4">
      <SectionCard title={`QR for ${node.display_name} — ${node.name}`} actions={<Link href={`/me/qr/${node.id}/poster`} className="px-3 py-1.5 rounded-lg bg-slate-100">Poster</Link>}>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center gap-3">
            <img src={q.img} alt="QR" className="w-60 h-60 bg-white p-2 rounded-lg border"/>
            <div className="text-xs text-slate-500 break-all">{q.url}</div>
          </div>
          <div className="text-sm text-slate-700">
            <p>Print and place this QR at your location. Scanning directs users to the review entry page.</p>
            <p className="mt-2">Base URL: <code className="bg-slate-100 px-1 rounded">{base}</code></p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
