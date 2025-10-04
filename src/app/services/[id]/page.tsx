import { pool } from "@/lib/db";

interface Props { params: { id: string } }

export default async function ServicePage({ params }: Props){
  const { rows } = await pool.query(
    `SELECT sn.id, sn.name, sn.city, sn.country, s.display_name AS service_name
     FROM public.service_nodes sn
     JOIN public.services s ON s.id = sn.service_id
     WHERE sn.id = $1`, [params.id]);
  const n = rows[0];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{n?.name || "Service node"}</h1>
      {!n && <p className="text-slate-600">Coming soon…</p>}
      {n && (
        <div className="card">
          <p className="text-slate-700"><strong>Service:</strong> {n.service_name}</p>
          <p className="text-slate-700"><strong>Location:</strong> {n.city || ""} {n.country ? `• ${n.country}` : ""}</p>
          <p className="text-slate-500 text-sm">This page will later include reviews, transparency card, and actions.</p>
        </div>
      )}
    </div>
  );
}
