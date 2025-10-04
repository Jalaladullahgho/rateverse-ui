import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const ok = await isPlatformAdmin(user.id);
  if (!ok) {
    return <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="text-slate-600">You need platform_admin role to view this page.</p>
    </div>;
  }

  const { rows: daily }  = await pool.query(`SELECT day, total_reviews, approved_reviews, approval_rate_pct, flagged_count, qr_share, invite_share FROM public.dashboard_daily_metrics_v ORDER BY day`);
  const { rows: rep }    = await pool.query(`SELECT * FROM public.platform_reputation_v`);
  const { rows: rolling }= await pool.query(`SELECT * FROM public.admin_kpi_rolling_v`);
  const { rows: mix365 } = await pool.query(`SELECT * FROM public.channel_mix_365_v`);
  const { rows: timings }= await pool.query(`SELECT * FROM public.moderation_timings_v`);
  const { rows: funnel } = await pool.query(`SELECT * FROM public.platform_funnel_v`);

  const latest = daily[daily.length - 1] || null;

  const { rows: inbox } = await pool.query(`
    SELECT r.id, r.title, r.body, r.rating, r.submitted_at,
           sn.name AS node_name, s.display_name AS service_name,
           u.full_name AS user_name, u.email AS user_email,
           COALESCE(rs.device_burst,false) AS suspicious_device_burst,
           COALESCE(rs.user_burst,false)   AS suspicious_user_burst,
           COALESCE(rs.ocr_low_conf,false) AS suspicious_ocr_low
    FROM public.reviews r
    JOIN public.service_nodes sn ON sn.id = r.service_node_id
    JOIN public.services s ON s.id = sn.service_id
    JOIN public.users u ON u.id = r.user_id
    LEFT JOIN public.review_suspicion_v rs ON rs.review_id = r.id
    WHERE r.status='pending'
    ORDER BY r.submitted_at ASC
    LIMIT 25
  `);

  return <AdminDashboard
    daily={daily as any}
    latest={latest as any}
    inbox={inbox as any}
    platform={(rep[0] || null) as any}
    rolling={(rolling[0] || null) as any}
    mix365={(mix365[0] || null) as any}
    timings={(timings[0] || null) as any}
    funnel={(funnel[0] || null) as any}
  />;
}
