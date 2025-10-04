"use client";
import useSWR from "swr";
import { useState } from "react";
const fetcher = (u:string)=> fetch(u).then(r=>r.json());

export default function SignUpPage(){
  const { data: countries } = useSWR("/api/countries", fetcher);
  const [fullName,setFullName]=useState("");
  const [email,setEmail]=useState("");
  const [country,setCountry]=useState("");
  const [phone,setPhone]=useState("");
  const [agree,setAgree]=useState(true);
  const [msg,setMsg]=useState("");

  async function createAccount(){
    setMsg("");
    if(!agree) { setMsg("Please agree to the terms"); return; }
    const r = await fetch("/api/auth/sign-up",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ fullName, email, country, phone })});
    const j = await r.json();
    if(r.ok){
      setMsg(`Account saved. Verification code (dev): ${j.dev_code}. Go to Login.`);
    } else {
      setMsg(j.error||"Failed to create account");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Create your account</h1>

      <div className="card space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input className="w-full border rounded-lg p-2" value={fullName} onChange={e=>setFullName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="w-full border rounded-lg p-2" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Country</label>
            <select className="w-full border rounded-lg p-2" value={country} onChange={e=>setCountry(e.target.value)}>
              <option value="">Select country</option>
              {(countries||[]).map((c:any)=> <option key={c.iso2} value={c.iso2}>{c.name_en}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Phone (with country code)</label>
            <input className="w-full border rounded-lg p-2" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+9665..." />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
          I agree to the terms and conditions
        </label>

        <div className="flex gap-3">
          <button onClick={createAccount} className="btn btn-primary">Create account</button>
          <a href="/sign-in" className="btn btn-outline">Or sign in</a>
        </div>

        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </div>
    </div>
  );
}
