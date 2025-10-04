'use client';
import { useEffect, useState } from 'react';
import { listPublicContests } from '@/lib/api_contests';
import ContestCard from '@/components/contests/ContestCard';

export default function ContestsPage(){
  const [data,setData] = useState<any[]>([]);
  useEffect(()=>{ listPublicContests().then(r=>setData(r.items||[])); },[]);
  return (
    <main dir="rtl" className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">المسابقات</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map(c=>(<ContestCard key={c.id} c={c}/>))}
      </div>
    </main>
  );
}