import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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
  skills: text("skills", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  industries: text("industries", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  workplacePreference: text("workplace_preference", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  /** Non renseigné = inconnu (pas de valeur par défaut à 0, sous peine de fausser le matching). */
  yearsOfExperience: integer("years_of_experience"),
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
  provider: text("provider", {
    enum: ["anthropic", "openai", "openrouter"],
  }).notNull(),
  apiKey: text("api_key").notNull(),
  keyPreview: text("key_preview").notNull(),
  modelExtraction: text("model_extraction"),
  modelScoring: text("model_scoring"),
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
 * Configuration de la veille IA — une ligne par utilisateur (upsert). `lastRunAt`
 * est la base du calcul "est-ce dû ?" (comparé à `intervalMinutes`), géré par le
 * scheduler, jamais saisi par l'utilisateur.
 */
export const aiWatchConfigs = sqliteTable("ai_watch_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  intervalMinutes: integer("interval_minutes").notNull().default(1440),
  lastRunAt: integer("last_run_at", { mode: "timestamp_ms" }),
  lastRunStatus: text("last_run_status", { enum: ["success", "error"] }),
  lastRunError: text("last_run_error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type AiWatchConfig = typeof aiWatchConfigs.$inferSelect;
export type NewAiWatchConfig = typeof aiWatchConfigs.$inferInsert;

/**
 * Offre découverte par la veille et notée contre le profil de l'utilisateur.
 * `(userId, source, externalId)` est unique : c'est ce qui déduplique entre deux
 * runs (insertion en `onConflictDoNothing`), une même offre revue plus tard ne
 * crée pas de doublon.
 */
export const jobOffers = sqliteTable(
  "job_offers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    company: text("company").notNull(),
    role: text("role").notNull(),
    url: text("url").notNull(),
    location: text("location"),
    description: text("description"),
    matchScore: integer("match_score").notNull(),
    matchReason: text("match_reason"),
    /**
     * Champs structurés hiring.cafe (via Apify), utilisés par le scoring et l'affichage.
     * Tous nullables : `null` = inconnu (la normalisation Python convertit déjà les
     * valeurs par défaut de l'acteur — `0`, `""`, `[]` — en `null` avant insertion).
     */
    seniorityLevel: text("seniority_level"),
    technicalTools: text("technical_tools", { mode: "json" }).$type<string[]>(),
    minYearsExperience: integer("min_years_experience"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    workplaceType: text("workplace_type"),
    companyIndustries: text("company_industries", { mode: "json" }).$type<
      string[]
    >(),
    dismissed: integer("dismissed", { mode: "boolean" })
      .notNull()
      .default(false),
    discoveredAt: integer("discovered_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("job_offers_user_source_external_idx").on(
      table.userId,
      table.source,
      table.externalId,
    ),
    index("job_offers_user_dismissed_score_idx").on(
      table.userId,
      table.dismissed,
      table.matchScore,
    ),
  ],
);

export type JobOffer = typeof jobOffers.$inferSelect;
export type NewJobOffer = typeof jobOffers.$inferInsert;

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Libellé choisi par l'utilisateur ("Claude Desktop", "laptop perso"). */
    name: text("name").notNull(),
    /** SHA-256 hex du token complet — seule forme persistée du secret. */
    lookupHash: text("lookup_hash").notNull(),
    /** Forme affichable : `dt_…` + 4 derniers caractères. Jamais suffisant pour authentifier. */
    keyPreview: text("key_preview").notNull(),
    /** null = jamais utilisée. Écriture throttlée (au plus une fois par heure). */
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    /** null = pas d'expiration. */
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    /** Révocation douce : on garde la ligne pour l'audit plutôt que de supprimer. */
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("api_keys_user_idx").on(table.userId),
    uniqueIndex("api_keys_lookup_hash_idx").on(table.lookupHash),
  ],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

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
