
'use client';
import { useEffect, useState, Suspense } from 'react';
import CountrySelect from '@/components/common/CountrySelect';
import dynamic from 'next/dynamic';
const MapPicker = dynamic(()=> import('@/components/common/MapPickerClient'), { ssr:false });

export default function Restrictions({ contestId }:{contestId:string}){
  const [c,setC]=useState<any>(null);
  async function load(){
    const r= await fetch(`/api/owner/contests/${contestId}`,{credentials:'include'});
    const d= await r.json(); setC(d);
  }
  useEffect(()=>{ load(); },[contestId]);

  async function save(){
    await fetch(`/api/owner/contests/${contestId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ geo_restrictions: c.geo_restrictions, eligibility_json: c.eligibility_json }) });
    load();
  }

  if(!c) return <div className="text-sm text-gray-500">تحميل…</div>;

  return (
    <div className="space-y-4">
      <section className="space-y-2 p-4 rounded-2xl border bg-white/80 shadow-sm">
        <div className="font-semibold">البلدان المسموح بها</div>
        <CountrySelect value={c.geo_restrictions?.countries||[]} multiple onChange={(val:any)=>setC({...c, geo_restrictions: {...(c.geo_restrictions||{}), countries: val}})} />
      </section>
      <section className="space-y-2 p-4 rounded-2xl border bg-white/80 shadow-sm">
        <div className="font-semibold">سياج جغرافي (اختياري)</div>
        <Suspense fallback={<div className="text-xs text-gray-500 p-2">خريطة…</div>}>
          <MapPicker onPick={(pt:any)=>setC({...c, geo_restrictions: {...(c.geo_restrictions||{}), center: pt}})} />
        </Suspense>
        <input className="border p-2 rounded-xl mt-2" placeholder="radius_km" value={c.geo_restrictions?.radius_km||''} onChange={(e)=>setC({...c, geo_restrictions: {...(c.geo_restrictions||{}), radius_km: e.target.value? Number(e.target.value): null}})} />
      </section>
      <section className="space-y-2 p-4 rounded-2xl border bg-white/80 shadow-sm">
        <div className="font-semibold">أهلية المشاركة</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border p-2 rounded-xl" placeholder="R‑Score الأدنى" value={c.eligibility_json?.rscore_min||''} onChange={(e)=>setC({...c, eligibility_json:{...(c.eligibility_json||{}), rscore_min: e.target.value? Number(e.target.value): null}})} />
          <input className="border p-2 rounded-xl" placeholder="عمر الحساب بالأيام" value={c.eligibility_json?.account_age_days||''} onChange={(e)=>setC({...c, eligibility_json:{...(c.eligibility_json||{}), account_age_days: e.target.value? Number(e.target.value): null}})} />
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!c.eligibility_json?.verified_only} onChange={(e)=>setC({...c, eligibility_json:{...(c.eligibility_json||{}), verified_only: e.target.checked}})} />
            <span>الحسابات الموثقة فقط</span>
          </label>
        </div>
      </section>
      <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={save}>حفظ القيود</button>
    </div>
  );
}
