import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, beforeEach } from "vitest";

import { db } from "@/db";
import { applications, columns, transitions } from "@/db/schema";
import { ensureDefaultColumns } from "@/services/column";

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

beforeEach(async () => {
  await db.delete(transitions);
  await db.delete(applications);
  await db.delete(columns);
  await ensureDefaultColumns();
});
