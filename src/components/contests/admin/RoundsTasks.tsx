
'use client';
import { useEffect, useState } from 'react';

export default function RoundsTasks({ contestId }:{contestId:string}){
  const [roundName,setRoundName]=useState('جولة 1');
  const [rounds,setRounds]=useState<any[]>([]);
  const [taskKind,setTaskKind]=useState('ANSWER_TEXT');
  const [tasks,setTasks]=useState<any[]>([]);

  async function addRound(){
    const r = await fetch(`/api/owner/contests/${contestId}/rounds`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ name: roundName }) });
    const d = await r.json(); setRounds([...(rounds||[]), d]); setRoundName('');
  }
  async function addTask(){
    const r = await fetch(`/api/owner/contests/${contestId}/tasks`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ kind: taskKind, title: 'مهمة', points: 1 }) });
    const d = await r.json(); setTasks([...(tasks||[]), d]);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="font-semibold">الجولات</div>
        <div className="flex gap-2">
          <input className="border p-2 rounded-xl" value={roundName} onChange={e=>setRoundName(e.target.value)} placeholder="اسم الجولة" />
          <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={addRound}>إضافة جولة</button>
        </div>
        <ul className="text-sm text-gray-700 list-disc pr-6">
          {rounds.map((r:any)=>(<li key={r.id}>{r.name}</li>))}
        </ul>
      </section>
      <section className="space-y-3">
        <div className="font-semibold">المهام</div>
        <div className="flex gap-2">
          <select className="border p-2 rounded-xl" value={taskKind} onChange={e=>setTaskKind(e.target.value)}>
            <option value="ANSWER_TEXT">إجابة نص</option>
            <option value="MCQ">اختيار من متعدد</option>
            <option value="SCAN_QR">مسح QR</option>
            <option value="UPLOAD_PHOTO">رفع صورة</option>
            <option value="UPLOAD_VIDEO">رفع فيديو</option>
            <option value="CHECKIN">تتبّع/تسجيل حضور</option>
            <option value="REFERRAL">إحالة</option>
          </select>
          <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={addTask}>إضافة مهمة</button>
        </div>
        <ul className="text-sm text-gray-700 list-disc pr-6">
          {tasks.map((t:any)=>(<li key={t.id}>{t.kind} — {t.title}</li>))}
        </ul>
      </section>
    </div>
  );
}
