'use client';
import { useEffect, useState } from 'react';
import { listWinners } from '@/lib/api_contests';
export default function WinnersPage({ params }: any){
  const [w,setW] = useState<any[]>([]);
  useEffect(()=>{ listWinners(params.id).then(setW); },[params.id]);
  return (
    <main dir="rtl" className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">الفائزون</h1>
      <ul className="list-disc pr-6">
        {w.map((x:any)=>(<li key={x.id}>{x.user_id} — {x.published ? 'مُعلن' : 'غير مُعلن'}</li>))}
      </ul>
    </main>
  );
}