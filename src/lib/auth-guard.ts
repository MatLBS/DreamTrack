import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { ServiceError } from "@/services/errors";

/**
 * Guard prêt à brancher sur les server actions mutantes une fois qu'un flux de
 * connexion existera. Non appelé pour l'instant (app mono-utilisateur locale).
 */
export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new ServiceError("UNAUTHORIZED", "Authentication required");
  }
  return session;
}
