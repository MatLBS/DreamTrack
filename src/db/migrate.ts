import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:src/dev.db";

  const client = createClient({ url });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("✓ Migrations appliquées");
  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
