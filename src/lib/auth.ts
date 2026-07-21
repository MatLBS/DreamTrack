import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import { ensureDefaultColumns } from "@/services/column";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  account: {
    encryptOAuthTokens: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // rafraîchi toutes les 24h
  },
  databaseHooks: {
    user: {
      create: {
        /** Nouveau compte = board vierge : seed ses 6 colonnes par défaut. */
        after: async (user) => {
          await ensureDefaultColumns(user.id);
        },
      },
    },
  },
  plugins: [nextCookies()], // doit rester le dernier plugin
});
