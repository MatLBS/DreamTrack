import type { McpServer } from "@modelcontextprotocol/server";

import { UpdateProfileSchema } from "@/lib/validation/profile";
import { getProfile, updateProfile } from "@/services/profile";

import { withToolErrors } from "../errors";

export function registerProfileTools(server: McpServer, userId: string): void {
  server.registerTool(
    "profile_get",
    {
      title: "Get candidate profile",
      description:
        "Returns the user's job search preferences (desired positions, locations, skills, salary range, years of experience). Returns null if the user hasn't set one up yet — suggest calling profile_update in that case. This profile drives AI Watch's offer scoring.",
      annotations: { readOnlyHint: true },
    },
    async () => withToolErrors(() => getProfile(userId)),
  );

  server.registerTool(
    "profile_update",
    {
      title: "Update candidate profile",
      description:
        "Updates the user's job search preferences. Only the provided fields are changed; omitted fields keep their current value.",
      inputSchema: UpdateProfileSchema,
      annotations: { idempotentHint: true },
    },
    async (input) => withToolErrors(() => updateProfile(userId, input)),
  );
}
