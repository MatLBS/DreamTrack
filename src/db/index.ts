import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:src/dev.db";

const client = createClient({ url });

export const db = drizzle(client, { schema });
