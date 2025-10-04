'use client';
import { useEffect, useState } from 'react';
import { listOwnerContests } from '@/lib/api_contests';

export default function OwnerContestsPage(){
  const [data,setData] = useState<any[]>([]);
  useEffect(()=>{ listOwnerContests().then(r=>setData(r.items||[])); },[]);
  return (
    <main dir="rtl" className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">مسابقاتي</h1>
      <a href="/owner/contests/new" className="px-4 py-2 rounded bg-black text-white">مسابقة جديدة</a>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((c:any)=>(
          <div key={c.id} className="border rounded p-4 shadow-sm">
            <div className="text-lg font-semibold">{c.title}</div>
            <div className="text-sm text-gray-500">{c.type} • {c.status}</div>
            <div className="mt-2 flex gap-2">
              <a className="text-blue-600" href={`/contest/${c.slug}`}>عرض عام</a>
              <a className="text-blue-600" href={`/owner/contests/${c.id}`}>إدارة</a>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}