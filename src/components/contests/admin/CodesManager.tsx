
'use client';
import { useState } from 'react';

function download(filename:string, content:string, type='text/csv'){
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
}

export default function CodesManager({ contestId }:{contestId:string}){
  const [qty, setQty] = useState(50);
  const [len, setLen] = useState(10);
  const [tag, setTag] = useState<'NORMAL'|'GOLD'>('NORMAL');
  const [sku, setSku] = useState('');
  const [maxRed, setMaxRed] = useState(1);
  const [expires, setExpires] = useState<string>('');
  const [progress, setProgress] = useState<string>('');

  async function generate(){
    setProgress('...');
    const r = await fetch(`/api/owner/contests/${contestId}/codes/batch`, {
      method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ quantity: qty, length: len, tag, sku: sku||null, max_redemptions: maxRed, expires_at: expires||null })
    });
    const data = await r.json();
    setProgress(`تم إنشاء ${data?.codes?.length||0} كود`);
    if(data?.codes?.length){
      const csv = ['code,tag,sku,max_redemptions,expires_at'].concat(
        data.codes.map((c:any)=>[c.code,c.tag,c.sku||'',c.max_redemptions||1,c.expires_at||''].join(','))
      ).join('\n');
      download(`contest-${contestId}-codes.csv`, csv);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <input className="border p-2 rounded-xl" value={qty} onChange={e=>setQty(Number(e.target.value||0))} placeholder="الكمية" />
        <input className="border p-2 rounded-xl" value={len} onChange={e=>setLen(Number(e.target.value||0))} placeholder="طول الكود" />
        <select className="border p-2 rounded-xl" value={tag} onChange={e=>setTag(e.target.value as any)}>
          <option value="NORMAL">NORMAL</option>
          <option value="GOLD">GOLD</option>
        </select>
        <input className="border p-2 rounded-xl" value={sku} onChange={e=>setSku(e.target.value)} placeholder="SKU (اختياري)" />
        <input className="border p-2 rounded-xl" value={maxRed} onChange={e=>setMaxRed(Number(e.target.value||1))} placeholder="Max redemptions" />
        <input type="datetime-local" className="border p-2 rounded-xl" onChange={e=>setExpires(e.target.value ? new Date(e.target.value).toISOString() : '')} />
      </div>
      <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={generate}>توليد الدفعة وتحميل CSV</button>
      <div className="text-sm text-gray-500">{progress}</div>
      <div className="text-xs text-gray-400">ملاحظة: يتم حفظ Hash الأكواد فقط في القاعدة؛ لذا نزّل ملف الـCSV واحتفظ به للطباعة.</div>
    </div>
  );
}
