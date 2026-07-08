import { headers } from "next/headers";

import { ProfileView } from "@/components/profile/profile-view";
import { auth } from "@/lib/auth";
import { getApplicationStats } from "@/services/application";
import { getProfile } from "@/services/profile";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [profile, stats] = await Promise.all([
    getProfile(session.user.id),
    getApplicationStats(),
  ]);

  return <ProfileView user={session.user} profile={profile} stats={stats} />;
}
