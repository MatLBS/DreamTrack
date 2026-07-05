import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { columns, type NewColumn } from "./schema";

/** Les 6 colonnes par défaut, protégées et ordonnées. */
const DEFAULT_COLUMNS: NewColumn[] = [
  "Jobs applied to",
  "Replies",
  "Rejections",
  "No reply",
  "Accepted",
  "Rejected",
].map((name, position) => ({ name, position, isDefault: true }));

async function main() {
  const url = process.env.DATABASE_URL ?? "file:src/dev.db";

  const client = createClient({ url });
  const db = drizzle(client, { schema: { columns } });

  const existing = await db.select().from(columns).limit(1);

  if (existing.length > 0) {
    console.log("• Colonnes déjà présentes, seed ignoré");
  } else {
    await db.insert(columns).values(DEFAULT_COLUMNS);
    console.log(`✓ ${DEFAULT_COLUMNS.length} colonnes par défaut insérées`);
  }

  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
