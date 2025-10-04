"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import CountrySelect from "@/components/common/CountrySelect";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function CategoriesPage(){
  const [country, setCountry] = useState<string>("");
  const [q, setQ] = useState<string>("");


  const { data } = useSWR(`/api/categories/with-nodes?country=${country}&q=${encodeURIComponent(q)}`, fetcher);

  const roots = useMemo(()=> Object.values((data?.groups||{})), [data]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl p-8 border bg-gradient-to-br from-indigo-50 to-sky-50">
        <h1 className="text-2xl font-bold mb-2">Discover, try, write a review</h1>
        <p className="text-slate-600">Browse categories and services.</p>
      </section>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 border rounded-xl p-2 bg-white">
          <input className="flex-1 outline-none px-2" placeholder="Search a service name..." value={q} onChange={(e)=>setQ(e.target.value)} />
          <button className="btn btn-outline">Search</button>
        </div>
           <CountrySelect
          variant="native"
          value={country}
          onChange={(code)=> setCountry(code)}
          placeholder="All countries"/>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(roots as any[] || []).map((root:any)=>(
          <div key={root.root_id} className="card">
            <h2 className="font-semibold mb-3">{root.root_name}</h2>
            <div className="grid grid-cols-2 gap-3">
              {root.children.map((sub:any)=>(
                <div key={sub.sub_id} className="rounded-lg border p-3 bg-white">
                  <div className="text-sm font-medium">{sub.sub_name}</div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700 max-h-32 overflow-auto list-disc list-inside">
                    {sub.nodes.slice(0,6).map((n:string,idx:number)=> <li key={idx}>{n}</li>)}
                    {sub.nodes.length===0 && <li className="list-none text-slate-400">No services yet</li>}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
