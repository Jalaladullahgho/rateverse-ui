'use client';
import { useEffect, useState } from 'react';
import { getContest, enterContest } from '@/lib/api_contests';

export default function ContestDetail({ params }: any){
  const [c, setC] = useState<any>(null);
  const [answer,setAnswer] = useState('');
  useEffect(()=>{ getContest(params.slug).then(setC); },[params.slug]);
  if(!c) return <main className="p-6" dir="rtl">...</main>;
  return (
    <main dir="rtl" className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{c.title}</h1>
      <p className="text-gray-700">{c.description}</p>
      {c.type === 'RIDDLE' && (
        <div className="space-y-2">
          <input className="border p-2 rounded w-full" placeholder="اكتب إجابتك" value={answer} onChange={e=>setAnswer(e.target.value)}/>
          <button className="px-4 py-2 bg-black text-white rounded" onClick={async()=>{
            await enterContest(c.id, { entry_type: 'RIDDLE', answer_text: answer });
            alert('تم الإرسال');
          }}>إرسال</button>
        </div>
      )}
      {c.type === 'QR_CODE' && (
        <div className="space-y-2">
          <input className="border p-2 rounded w-full" placeholder="ادخل الكود (hash أو raw)" />
          <div className="text-xs text-gray-500">للاختبار فقط في الواجهة</div>
        </div>
      )}
    </main>
  );
}