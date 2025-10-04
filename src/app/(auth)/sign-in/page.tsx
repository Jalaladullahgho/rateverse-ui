"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignInPage(){
  const [identifier,setIdentifier]=useState("");
  const [sent,setSent]=useState(false);
  const [code,setCode]=useState("");
  const [msg,setMsg]=useState("");

  async function requestCode(){
    setMsg("");
    const r=await fetch("/api/auth/request-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ identifier })});
    const j=await r.json();
    if(r.ok){ setSent(true); setMsg(`Verification code (dev): ${j.dev_code}`); }
    else { setMsg(j.error||"Failed to send code"); }
  }

  async function verify(){
    setMsg("");
    const r=await fetch("/api/auth/verify-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ identifier, code })});
    const j=await r.json();
    if(r.ok){ window.location.href="/"; } else { setMsg(j.error||"Verification failed"); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Sign in</h1>

      <div className="card">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm mb-1">Email or phone</label>
            <input className="w-full border rounded-lg p-2" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm mb-1">Verification code</label>
            <input className="w-full border rounded-lg p-2" value={code} onChange={e=>setCode(e.target.value)} placeholder={sent ? "Enter the 6-digit code" : "Press Send to receive code"} />
          </div>
          <div className="md:col-span-1 flex gap-2">
            {!sent ? (
              <button onClick={requestCode} className="btn btn-primary w-full">Send code</button>
            ) : (
              <button onClick={verify} className="btn btn-primary w-full">Login</button>
            )}
          </div>
        </div>
        {msg && <p className="text-sm text-slate-600 mt-3">{msg}</p>}
      </div>

      <p className="text-sm text-slate-600">
        Don&apos;t have an account? <Link className="text-blue-600 underline" href="/sign-up">Create one</Link>
      </p>
    </div>
  );
}
