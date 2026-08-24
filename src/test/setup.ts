import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, beforeEach } from "vitest";

import { db } from "@/db";
import { apiKeys, applications, columns, transitions, user } from "@/db/schema";
import { ensureDefaultColumns } from "@/services/column";

/** Utilisateur fixe pour les tests scopés par `userId` — créé une seule fois. */
export const TEST_USER_ID = "test-user";

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db
    .insert(user)
    .values({ id: TEST_USER_ID, name: "Test User", email: "test@example.com" })
    .onConflictDoNothing();
});

beforeEach(async () => {
  await db.delete(transitions);
  await db.delete(applications);
  await db.delete(columns);
  await db.delete(apiKeys);
  await ensureDefaultColumns(TEST_USER_ID);
});
