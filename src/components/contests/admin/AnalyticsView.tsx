
'use client';
import { useEffect, useState } from 'react';

export default function AnalyticsView({ contestId, compact }:{ contestId: string, compact?: boolean }){
  const [data,setData]=useState<any>(null);
  async function load(){
    const r= await fetch(`/api/owner/contests/${contestId}/analytics`,{credentials:'include'});
    const d= await r.json(); setData(d);
  }
  useEffect(()=>{ load(); },[contestId]);

  if(!data) return <div className="text-sm text-gray-500">تحميل…</div>;

  return (
    <div className="space-y-4">
      <div className={"grid gap-3 " + (compact? "grid-cols-2 md:grid-cols-4":"grid-cols-2 md:grid-cols-6")}>
        {['participants','entries','correct','incorrect','winners','codes_redeemed'].map((k)=>(
          <div key={k} className="p-4 rounded-2xl border bg-white/80 shadow-sm">
            <div className="text-sm text-gray-500">{k}</div>
            <div className="text-2xl font-bold">{data[k] ?? 0}</div>
          </div>
        ))}
      </div>
      {!compact && (
        <div className="p-4 rounded-2xl border bg-white/80 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">تفصيل حسب اليوم</div>
          <div className="grid grid-cols-12 gap-1 items-end h-40">
            {(data.daily||[]).map((d:any)=>(
              <div key={d.d} title={d.d} className="bg-gray-900 rounded" style={{height: `${Math.min(100, d.c)}%`}}></div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">مخطط عمودي بسيط لعدد المشاركات اليومية</div>
        </div>
      )}
    </div>
  );
}
