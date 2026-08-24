import { headers } from "next/headers";

import { ProfileView } from "@/components/profile/profile-view";
import { auth } from "@/lib/auth";
import { getApplicationStats } from "@/services/application";
import { listApiKeys } from "@/services/api-key";
import { getLlmCredentialSummary } from "@/services/llm-credential";
import { getProfile } from "@/services/profile";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [profile, stats, llmKeySummary, apiKeys] = await Promise.all([
    getProfile(session.user.id),
    getApplicationStats(session.user.id),
    getLlmCredentialSummary(session.user.id),
    listApiKeys(session.user.id),
  ]);

  const mcpEndpoint = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/mcp`;

  return (
    <ProfileView
      user={session.user}
      profile={profile}
      stats={stats}
      llmKeySummary={llmKeySummary}
      apiKeys={apiKeys}
      mcpEndpoint={mcpEndpoint}
    />
  );
}
