
'use client';
import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import CountrySelect from '@/components/common/CountrySelect';

const MapPicker = dynamic(() => import('@/components/common/MapPickerClient'), { ssr: false, loading: ()=> <div className="p-4 text-sm text-gray-500">جارٍ تحميل الخريطة…</div> });

type Props = { onCreated?: (c:any)=>void, createContest?: (payload:any)=>Promise<any> };
export default function Wizard({ onCreated, createContest }: Props){
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>({
    owner_kind: 'USER',
    owner_ref_id: null,
    owner_service_id: null,
    slug: '',
    title: '',
    description: '',
    branding_theme: { primary:'#111', accent:'#6b7280' },
    type: 'RIDDLE',
    selection: 'RANDOM_FROM_CORRECT',
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now()+86400000).toISOString(),
    max_winners: null,
    require_receipt: false,
    per_user_limit: 1,
    visibility: 'public',
    prize_summary: '',
    rules_json: { text: '' },
    geo_restrictions: { countries: [], center: null, radius_km: null },
    eligibility_json: { rscore_min: null, account_age_days: null, verified_only: false },
  });

  const next = ()=> setStep(s=>s+1);
  const back = ()=> setStep(s=>Math.max(0,s-1));
  const input = (k:string)=>(e:any)=> setForm((f:any)=>({...f,[k]: e?.target ? e.target.value : e }));

  const Section = ({ title, children }:{title:string, children:any}) => (
    <section className="space-y-4 p-4 rounded-2xl border bg-white/80 shadow-sm">
      <div className="text-lg font-semibold">{title}</div>
      {children}
    </section>
  );

  return (
    <div className="max-w-3xl space-y-4" dir="rtl">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>الخطوة</span><span className="font-bold">{step+1}</span><span>من 8</span>
      </div>

      {step===0 && (
        <Section title="0) سياق النشر (الملكية)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['USER','SERVICE','ORG'].map(k=> (
              <button key={k} onClick={()=>setForm({...form, owner_kind:k})}
                className={
                  "p-4 border rounded-xl hover:shadow transition " + (form.owner_kind===k ? "border-black" : "border-gray-200")
                }>
                <div className="font-semibold">{k==='USER'?'شخصي':k==='SERVICE'?'خدمة':'منظمة'}</div>
                <div className="text-xs text-gray-500">النشر باسم {k==='USER'?'حسابك':'الكيان المحدد'}</div>
              </button>
            ))}
          </div>
          {form.owner_kind!=='USER' && (
            <div className="space-y-1">
              <label className="text-sm">المعرّف المرجعي ({form.owner_kind})</label>
              <input className="border p-2 rounded w-full" placeholder="UUID للكيان" value={form.owner_ref_id||''} onChange={input('owner_ref_id')} />
            </div>
          )}
          <div className="flex gap-2 justify-between">
            <div />
            <button className="px-4 py-2 bg-black text-white rounded-xl" onClick={next}>التالي</button>
          </div>
        </Section>
      )}

      {step===1 && (
        <Section title="1) النوع">
          <select className="border p-2 rounded w-full" value={form.type} onChange={input('type')}>
            <option value="RIDDLE">لغز/سؤال</option>
            <option value="QR_CODE">أكواد/QR</option>
            <option value="UGC">محتوى من المستخدم</option>
            <option value="LEADERBOARD">تحدي نقاط</option>
            <option value="TREASURE_HUNT">صيد كنز/نقاط ميدانية</option>
            <option value="REFERRAL">إحالات</option>
            <option value="PREDICTION">تنبؤ/توقّع</option>
            <option value="SURVEY">استبيان مع جوائز</option>
          </select>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 rounded-xl" onClick={back}>السابق</button>
            <button className="px-4 py-2 bg-black text-white rounded-xl" onClick={next}>التالي</button>
          </div>
        </Section>
      )}

      {step===2 && (
        <Section title="2) التفاصيل">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border p-2 rounded-xl" placeholder="العنوان" value={form.title} onChange={input('title')}/>
            <input className="border p-2 rounded-xl" placeholder="المعرف (slug)" value={form.slug} onChange={input('slug')}/>
            <input className="border p-2 rounded-xl" placeholder="الحد الأقصى للفائزين (اختياري)" value={form.max_winners||''} onChange={e=>setForm({...form, max_winners: e.target.value? Number(e.target.value): null})}/>
            <input className="border p-2 rounded-xl" placeholder="الحد لكل مستخدم" value={form.per_user_limit} onChange={e=>setForm({...form, per_user_limit: Number(e.target.value||1)})}/>
          </div>
          <textarea className="border p-3 rounded-xl w-full" rows={5} placeholder="الوصف" value={form.description} onChange={input('description')}/>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 rounded-xl" onClick={back}>السابق</button>
            <button className="px-4 py-2 bg-black text-white rounded-xl" onClick={next}>التالي</button>
          </div>
        </Section>
      )}

      {step===3 && (
        <Section title="3) الجدولة">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">البداية</label>
<input
  type="datetime-local"
  className="border p-2 rounded-xl w-full"
  value={form.starts_at ? new Date(form.starts_at).toISOString().slice(0,16) : ''}
  onChange={(e)=>setForm({...form, starts_at: new Date(e.target.value).toISOString()})}
/>            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">النهاية</label>
              <input
  type="datetime-local"
  className="border p-2 rounded-xl w-full"
  value={form.ends_at ? new Date(form.ends_at).toISOString().slice(0,16) : ''}
  onChange={(e)=>setForm({...form, ends_at: new Date(e.target.value).toISOString()})}
/>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 rounded-xl" onClick={back}>السابق</button>
            <button className="px-4 py-2 bg-black text-white rounded-xl" onClick={next}>التالي</button>
          </div>
        </Section>
      )}

      {step===4 && (
        <Section title="4) آلية اختيار الفائز">
          <select className="border p-2 rounded-xl w-full" value={form.selection} onChange={input('selection')}>
            <option value="FIRST_CORRECT">أول إجابة صحيحة</option>
            <option value="RANDOM_FROM_CORRECT">سحب من الإجابات الصحيحة</option>
            <option value="TOP_SCORE">أعلى نقاط</option>
            <option value="FASTEST_TIME">أسرع وقت</option>
            <option value="EVERY_CODE">كل كود فوز</option>
            <option value="MOST_CODES">أكثر أكواد</option>
            <option value="THRESHOLD">تجاوز عتبة</option>
          </select>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 rounded-xl" onClick={back}>السابق</button>
            <button className="px-4 py-2 bg-black text-white rounded-xl" onClick={next}>التالي</button>
          </div>
        </Section>
      )}

      {step===5 && (
        <Section title="5) الجوائز">
          <input className="border p-2 rounded-xl w-full" placeholder="ملخص الجوائز" value={form.prize_summary} onChange={input('prize_summary')}/>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!form.require_receipt} onChange={(e)=>setForm({...form, require_receipt: e.target.checked})}/>
            <span>يتطلب إثبات شراء</span>
          </label>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 rounded-xl" onClick={back}>السابق</button>
            <button className="px-4 py-2 bg-black text-white rounded-xl" onClick={next}>التالي</button>
          </div>
        </Section>
      )}

      {step===6 && (
        <Section title="6) القيود (جغرافيا + أهلية)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">الدول المسموح بها</div>
              <CountrySelect value={form.geo_restrictions.countries} onChange={(val:any)=>setForm({...form, geo_restrictions:{...form.geo_restrictions, countries: val}})} multiple />
              <div className="text-xs text-gray-500">يمكن تركها فارغة لتكون المسابقة عالمية.</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">نقطة مركزية ونصف قطر (اختياري)</div>
             <Suspense fallback={<div className="text-xs text-gray-500">خريطة…</div>}>
  <MapPicker
    value={
      form.geo_restrictions.center
        ? form.geo_restrictions.center
        : { lat: null, lng: null }
    }
    onPick={(pt:any)=>setForm({...form, geo_restrictions:{...form.geo_restrictions, center: pt}})}
  />
</Suspense>
              <input className="border p-2 rounded-xl w-full mt-2" placeholder="radius_km" value={form.geo_restrictions.radius_km||''} onChange={(e)=>setForm({...form, geo_restrictions:{...form.geo_restrictions, radius_km: e.target.value? Number(e.target.value): null}})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border p-2 rounded-xl" placeholder="R‑Score الأدنى (اختياري)" value={form.eligibility_json.rscore_min||''} onChange={(e)=>setForm({...form, eligibility_json:{...form.eligibility_json, rscore_min: e.target.value? Number(e.target.value): null}})} />
            <input className="border p-2 rounded-xl" placeholder="عُمر الحساب بالأيام (اختياري)" value={form.eligibility_json.account_age_days||''} onChange={(e)=>setForm({...form, eligibility_json:{...form.eligibility_json, account_age_days: e.target.value? Number(e.target.value): null}})} />
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={!!form.eligibility_json.verified_only} onChange={(e)=>setForm({...form, eligibility_json:{...form.eligibility_json, verified_only: e.target.checked}})} />
              <span>الحسابات الموثقة فقط</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 rounded-xl" onClick={back}>السابق</button>
            <button className="px-4 py-2 bg-black text-white rounded-xl" onClick={next}>التالي</button>
          </div>
        </Section>
      )}

      {step===7 && (
        <Section title="7) القواعد والمراجعة والنشر">
          <textarea className="border p-3 rounded-xl w-full" rows={6} placeholder="نص القواعد (سيظهر للمشاركين)" value={form.rules_json?.text||''} onChange={(e)=>setForm({...form, rules_json:{...form.rules_json, text: e.target.value}})} />
          /*<pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(form,null,2)}</pre>
          */
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 rounded-xl" onClick={back}>السابق</button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-xl" onClick={async()=>{
              const create = createContest || (async (payload:any)=>{
                const r = await fetch('/api/owner/contests', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload)});
                return await r.json();
              });
              const created = await create(form);
              onCreated?.(created);
            }}>إنشاء</button>
          </div>
        </Section>
      )}
    </div>
  );
}
