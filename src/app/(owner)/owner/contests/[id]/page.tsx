
'use client';
import { useEffect, useState } from 'react';
import AdminTabs from '@/components/contests/admin/AdminTabs';
import CodesManager from '@/components/contests/admin/CodesManager';
import RoundsTasks from '@/components/contests/admin/RoundsTasks';
import EntriesReview from '@/components/contests/admin/EntriesReview';
import JudgesManager from '@/components/contests/admin/JudgesManager';
import PrizesAwards from '@/components/contests/admin/PrizesAwards';
import AnalyticsView from '@/components/contests/admin/AnalyticsView';
import Restrictions from '@/components/contests/admin/Restrictions';
import Transparency from '@/components/contests/admin/Transparency';

export default function ContestAdmin({ params }: any){
  const [tab, setTab] = useState('overview');
  return (
    <main dir="rtl" className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المسابقة</h1>
      </div>
      <AdminTabs value={tab} onChange={setTab} />
      {tab==='overview' && <AnalyticsView contestId={params.id} compact />}
      {tab==='codes' && <CodesManager contestId={params.id} />}
      {tab==='rounds' && <RoundsTasks contestId={params.id} />}
      {tab==='entries' && <EntriesReview contestId={params.id} />}
      {tab==='judges' && <JudgesManager contestId={params.id} />}
      {tab==='prizes' && <PrizesAwards contestId={params.id} />}
      {tab==='analytics' && <AnalyticsView contestId={params.id} />}
      {tab==='restrictions' && <Restrictions contestId={params.id} />}
      {tab==='transparency' && <Transparency contestId={params.id} />}
    </main>
  );
}
