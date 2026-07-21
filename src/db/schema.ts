import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Colonnes du Kanban = nœuds du Sankey.
 * Les 6 colonnes par défaut (`isDefault`) sont protégées : suppression interdite
 * (renommage / réordonnancement autorisés). L'ordre d'affichage vient de `position`,
 * géré côté serveur.
 */
export const columns = sqliteTable(
  "columns",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    /** true = étape qui marque la candidature comme perdue (rouge) ; false = étape qui la fait avancer (vert). */
    isLostStage: integer("is_lost_stage", { mode: "boolean" })
      .notNull()
      .default(false),
    /** true = colonne "sans réponse" (ghosting) ; ne compte pas comme une réponse dans les stats. */
    isNoReplyStage: integer("is_no_reply_stage", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("columns_user_position_idx").on(table.userId, table.position),
  ],
);

/**
 * Une candidature = une carte. `columnId` est la colonne *actuelle*.
 * `position`, `createdAt`, `updatedAt` sont gérés serveur (jamais saisis par l'utilisateur).
 */
export const applications = sqliteTable(
  "applications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    role: text("role").notNull(),
    url: text("url"),
    notes: text("notes"),
    /** Chemin public d'une icône uploadée (`/uploads/icons/<uuid>.<ext>`). Prime sur le logo auto-détecté. */
    iconUrl: text("icon_url"),
    /** Candidature marquée comme prioritaire (étoile) par l'utilisateur. */
    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(false),
    columnId: text("column_id")
      .notNull()
      .references(() => columns.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("applications_user_column_position_idx").on(
      table.userId,
      table.columnId,
      table.position,
    ),
  ],
);

/**
 * Source de vérité du Sankey : chaque déplacement (et la création) d'une carte
 * écrit une ligne. `fromColumnId` NULL = événement de création (naissance de la carte).
 * On conserve tout l'historique.
 */
export const transitions = sqliteTable("transitions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  applicationId: text("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  fromColumnId: text("from_column_id").references(() => columns.id),
  toColumnId: text("to_column_id")
    .notNull()
    .references(() => columns.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Column = typeof columns.$inferSelect;
export type NewColumn = typeof columns.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Transition = typeof transitions.$inferSelect;
export type NewTransition = typeof transitions.$inferInsert;

/**
 * Préférences de recherche d'un utilisateur : poste visé, localisations souhaitées,
 * fourchette de salaire visée. Une ligne par utilisateur (upsert), créée à la
 * première sauvegarde depuis la page Profil.
 */
export const profiles = sqliteTable("profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  desiredPositions: text("desired_positions", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  locations: text("locations", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

/**
 * Clé API LLM fournie par l'utilisateur (BYOK — Anthropic ou OpenAI). Une ligne
 * par utilisateur (upsert). `keyPreview` (ex. "sk-ant-…4f2a") est la forme
 * affichée dans l'UI ; `apiKey` (clé en clair) n'est jamais renvoyée au client,
 * seulement lue côté serveur pour appeler le provider.
 */
export const llmCredentials = sqliteTable("llm_credentials", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["anthropic", "openai"] }).notNull(),
  apiKey: text("api_key").notNull(),
  keyPreview: text("key_preview").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type LlmCredential = typeof llmCredentials.$inferSelect;
export type NewLlmCredential = typeof llmCredentials.$inferInsert;

/**
 * Tables Better Auth (générées via `npx @better-auth/cli generate`).
 * Ne pas modifier la forme des colonnes à la main : régénérer via la CLI si le
 * schéma auth change (config dans `src/lib/auth.ts`).
 */
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
