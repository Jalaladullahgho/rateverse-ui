import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";

export const dynamic = "force-dynamic";

export default async function MeHome(){
  const user = await currentUser();
  const uid = user?.id;
  const [{ rows:rev }, { rows:wallet }] = await Promise.all([
    pool.query(`SELECT id, rating, submitted_at, service_node_id FROM public.reviews WHERE user_id=$1 ORDER BY submitted_at DESC LIMIT 5`, [uid]),
    pool.query(`SELECT w.balance_cents FROM public.wallet_accounts w WHERE w.user_id=$1`, [uid])
  ]);

  return (
    <>
      <SectionCard title="Welcome">
        <div className="text-slate-700">Manage your profile, services and activity.</div>
      </SectionCard>

      <div className="grid md:grid-cols-2 gap-4">
        <SectionCard title="Latest reviews">
          <ul className="list-disc pl-5 text-sm">
            {rev.map((r:any)=>(<li key={r.id}>Rating {r.rating ?? "–"} — {new Date(r.submitted_at).toLocaleDateString()}</li>))}
            {!rev.length && <div className="text-slate-500 text-sm">No reviews yet.</div>}
          </ul>
        </SectionCard>
        <SectionCard title="Wallet">
          <div className="text-2xl font-semibold">{wallet[0]?.balance_cents ? (wallet[0].balance_cents/100).toFixed(2) : "0.00"} USD</div>
        </SectionCard>
      </div>
    </>
  );
}
