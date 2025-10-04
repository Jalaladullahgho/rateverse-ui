"use client";
import { useState } from "react";
import AvatarUploader from "@/components/ui/AvatarUploader";

export default function ProfileSettingsForm({ user }:{ user:{ id:string; full_name?:string; avatar_url?:string } }){
  const [fullName, setFullName] = useState(user.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [msg, setMsg] = useState("");

  return (
    <form onSubmit={async (e)=>{
      e.preventDefault();
      setMsg("");
      const r = await fetch("/api/me/profile", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl || null })
      });
      const j = await r.json().catch(()=>({}));
      if(r.ok){ setMsg("Saved"); } else { setMsg(j.error || "Failed"); }
    }} className="card grid gap-3">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Full name</span>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Avatar</span>
          <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
        </div>
      </div>
      <div>
        <button className="btn btn-primary">Save</button>
        {msg && <span className="text-sm ml-2">{msg}</span>}
      </div>
    </form>
  );
}
