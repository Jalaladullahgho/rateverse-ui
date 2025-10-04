
'use client';
import { useEffect, useState } from 'react';

export default function PrizesAwards({ contestId }:{contestId:string}){
  const [items,setItems]=useState<any[]>([]);
  const [name,setName]=useState('');
  const [type,setType]=useState('VOUCHER');
  const [quantity,setQuantity]=useState(1);
  const [amount,setAmount]=useState('');
  const [currency,setCurrency]=useState('SAR');
  const [winners,setWinners]=useState<any[]>([]);

  async function load(){
    const r = await fetch(`/api/owner/contests/${contestId}`,{credentials:'include'});
    const d = await r.json(); // not used
    const p = await fetch(`/api/owner/contests/${contestId}/prizes`,{method:'GET'}).catch(()=>null);
    if(p && p.ok){ const pd = await p.json(); setItems(pd.items||[]); }
    const w = await fetch(`/api/contests/${contestId}/winners`); setWinners(await w.json());
  }
  useEffect(()=>{ load(); },[]);

  async function add(){
    const r = await fetch(`/api/owner/contests/${contestId}/prizes`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ name, type, quantity, amount: amount? Number(amount): null, currency }) });
    if(r.ok){ setName(''); setAmount(''); load(); }
  }

  async function issue(winnerId:string){
    await fetch(`/api/owner/contests/${contestId}/winners/${winnerId}/issue`, { method:'POST', credentials:'include' });
    load();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="font-semibold">إضافة جائزة</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="border p-2 rounded-xl" placeholder="اسم الجائزة" value={name} onChange={e=>setName(e.target.value)} />
          <select className="border p-2 rounded-xl" value={type} onChange={e=>setType(e.target.value)}>
            <option value="VOUCHER">قسيمة</option>
            <option value="WALLET_CREDIT">رصيد محفظة</option>
            <option value="PHYSICAL">جائزة مادية</option>
            <option value="ACCESS">وصول/ترقية</option>
            <option value="BADGE">شارة</option>
          </select>
          <input className="border p-2 rounded-xl" placeholder="الكمية" value={quantity} onChange={e=>setQuantity(Number(e.target.value||1))} />
          <input className="border p-2 rounded-xl" placeholder="القيمة (اختياري)" value={amount} onChange={e=>setAmount(e.target.value)} />
          <input className="border p-2 rounded-xl" placeholder="العملة" value={currency} onChange={e=>setCurrency(e.target.value)} />
        </div>
        <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={add}>حفظ الجائزة</button>
      </section>

      <section className="space-y-3">
        <div className="font-semibold">الفائزون</div>
        <div className="overflow-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-2">Entry</th><th className="p-2">User</th><th className="p-2">Status</th><th className="p-2">إصدار</th></tr></thead>
            <tbody>
              {winners.map((w:any)=>(
                <tr key={w.id} className="border-t">
                  <td className="p-2">{w.entry_id}</td>
                  <td className="p-2">{w.user_id}</td>
                  <td className="p-2">{w.published? 'مُعلن':'غير مُعلن'}</td>
                  <td className="p-2"><button className="px-3 py-1 rounded bg-black text-white" onClick={()=>issue(w.id)}>إصدار</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
