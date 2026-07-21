import { asc } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import { ensureDefaultColumns } from "@/services/column";

async function main() {
  const [firstUser] = await db.select().from(user).orderBy(asc(user.createdAt));
  if (!firstUser) {
    throw new Error(
      "No user found — sign up once (npm run dev, then /signup) before seeding columns.",
    );
  }

  await ensureDefaultColumns(firstUser.id);
}

main()
  .then(() => console.log("✓ Default columns ensured"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
