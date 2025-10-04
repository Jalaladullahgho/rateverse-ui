
'use client';
import { useEffect, useState } from 'react';

export default function Transparency({ contestId }:{contestId:string}){
  const [proof,setProof]=useState<any>(null);
  const [seedReveal,setSeedReveal]=useState('');
  const [extEntropy,setExtEntropy]=useState('');

  async function load(){
    const r= await fetch(`/api/contests/${contestId}/proof`);
    if(r.ok){ setProof(await r.json()); }
  }
  useEffect(()=>{ load(); },[contestId]);

  async function publish(){
    await fetch(`/api/owner/contests/${contestId}/draw`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ seed_reveal: seedReveal, external_entropy: extEntropy, take: 10 }) });
    load();
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 p-4 rounded-2xl border bg-white/80 shadow-sm">
        <div className="font-semibold">نشر الفائزين وإثبات السحب</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border p-2 rounded-xl" placeholder="seed_reveal" value={seedReveal} onChange={e=>setSeedReveal(e.target.value)} />
          <input className="border p-2 rounded-xl" placeholder="external_entropy" value={extEntropy} onChange={e=>setExtEntropy(e.target.value)} />
          <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={publish}>تشغيل السحب والنشر</button>
        </div>
      </section>
      <section className="space-y-2 p-4 rounded-2xl border bg-white/80 shadow-sm">
        <div className="font-semibold">بينة السحب</div>
        {proof? <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(proof,null,2)}</pre> : <div className="text-sm text-gray-500">لا توجد بينة منشورة بعد</div>}
      </section>
    </div>
  );
}
