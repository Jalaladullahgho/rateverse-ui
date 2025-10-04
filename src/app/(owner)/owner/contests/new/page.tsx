'use client';
import { useState } from 'react';
import Wizard from '@/components/contests/Wizard';

export default function NewContest(){
  const [created, setCreated] = useState<any>(null);
  return (
    <main dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">إنشاء مسابقة</h1>
      {!created ? <Wizard onCreated={(c)=>setCreated(c)}/> : (
        <div className="space-y-2">
          <div className="text-green-700 font-semibold">تم إنشاء المسابقة</div>
          <a className="text-blue-600" href={`/owner/contests/${created.id}`}>اذهب للإدارة</a>
        </div>
      )}
    </main>
  )
}