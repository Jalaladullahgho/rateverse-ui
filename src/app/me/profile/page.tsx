import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";
import AvatarUploader from "@/components/me/AvatarUploader";
import { redirect } from "next/navigation";
import CountrySelect from "@/components/forms/CountrySelect";


export const dynamic = "force-dynamic";

export default async function ProfilePage(){
  const user = await currentUser();
  if(!user) redirect("/sign-in");

  const { rows } = await pool.query(
    `SELECT id, email, full_name, avatar_url, country
     FROM public.users WHERE id=$1`,
    [user.id]
  );
  const me = rows[0] || {};

  return (
    <div className="space-y-4">
      <SectionCard title="Profile">
        <form method="post" action="/api/me/profile" className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Full name</span>
            <input name="full_name" defaultValue={me?.full_name ?? ""} className="h-10 rounded-lg border px-3"/>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Country</span>
            <CountrySelect name="country" defaultValue={me?.country ?? ""} />
          </label>

          <div className="col-span-full flex items-center gap-3">
            <img
              src={me?.avatar_url || "/avatar-placeholder.png"}
              alt=""
              className="w-14 h-14 rounded-full object-cover border"
            />
            <AvatarUploader targetInputId="avatar_url_input" />

            <input id="avatar_url_input" type="hidden" name="avatar_url" defaultValue={me?.avatar_url||""}/>
          </div>

          <div className="col-span-full">
            <button className="px-4 h-10 rounded-lg bg-slate-900 text-white">Save</button>
          </div>
        </form>
        <div className="text-xs text-slate-500 mt-2">Email and phone are not editable here.</div>
      </SectionCard>
    </div>
  );
}
