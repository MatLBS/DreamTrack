import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: process.env.ENV === "dev" ? "sqlite" : "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:src/dev.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
