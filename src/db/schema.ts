import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Colonnes du Kanban = nœuds du Sankey.
 * Les 6 colonnes par défaut (`isDefault`) sont protégées : suppression interdite
 * (renommage / réordonnancement autorisés). L'ordre d'affichage vient de `position`,
 * géré côté serveur.
 */
export const columns = sqliteTable("columns", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Une candidature = une carte. `columnId` est la colonne *actuelle*.
 * `position`, `createdAt`, `updatedAt` sont gérés serveur (jamais saisis par l'utilisateur).
 */
export const applications = sqliteTable("applications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  company: text("company").notNull(),
  role: text("role").notNull(),
  url: text("url"),
  notes: text("notes"),
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
});

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
