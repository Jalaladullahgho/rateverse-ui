import Link from "next/link";
import { currentUser } from "@/lib/session";

// Server Component: shows a compact "Profile" link if user is signed-in
export default async function ProfileLink() {
  const user = await currentUser();
  if (!user) return null;
  return (
    <Link href="/me" className="btn btn-outline h-9 px-3 rounded-xl">
      Profile
    </Link>
  );
}
