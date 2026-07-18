import { headers } from "next/headers";

import { ProfileView } from "@/components/profile/profile-view";
import { auth } from "@/lib/auth";
import { getApplicationStats } from "@/services/application";
import { getLlmCredentialSummary } from "@/services/llm-credential";
import { getProfile } from "@/services/profile";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [profile, stats, llmKeySummary] = await Promise.all([
    getProfile(session.user.id),
    getApplicationStats(),
    getLlmCredentialSummary(session.user.id),
  ]);

  return (
    <ProfileView
      user={session.user}
      profile={profile}
      stats={stats}
      llmKeySummary={llmKeySummary}
    />
  );
}
