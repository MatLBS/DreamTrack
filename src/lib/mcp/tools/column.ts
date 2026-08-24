import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  CreateColumnSchema,
  RenameColumnSchema,
  ReorderColumnSchema,
  SetColumnCategorySchema,
} from "@/lib/validation/column";
import {
  createColumn,
  deleteColumn,
  getColumns,
  renameColumn,
  reorderColumn,
  setColumnCategory,
} from "@/services/column";

import { withToolErrors } from "../errors";

export function registerColumnTools(server: McpServer, userId: string): void {
  server.registerTool(
    "columns_list",
    {
      title: "List columns",
      description:
        "Returns every Kanban column with its id, name and position. Lighter than board_get when applications aren't needed.",
      annotations: { readOnlyHint: true },
    },
    async () => withToolErrors(() => getColumns(userId)),
  );

  server.registerTool(
    "column_create",
    {
      title: "Create column",
      description:
        "Creates a new column at the given index. index must be within the free zone (between the entry column and the two fixed terminal columns) — call columns_list first to know the valid range.",
      inputSchema: CreateColumnSchema,
    },
    async (input) => withToolErrors(() => createColumn(userId, input)),
  );

  server.registerTool(
    "column_rename",
    {
      title: "Rename column",
      description: "Renames a column, including default columns.",
      inputSchema: RenameColumnSchema.extend({
        id: z.string().min(1).describe("Column id, from columns_list or board_get"),
      }),
      annotations: { idempotentHint: true },
    },
    async ({ id, ...input }) => withToolErrors(() => renameColumn(userId, id, input)),
  );

  server.registerTool(
    "column_set_category",
    {
      title: "Set column category",
      description:
        "Marks a column as a lost stage (red) or an advancing stage (green). Fails on the entry column, whose category is fixed.",
      inputSchema: SetColumnCategorySchema.extend({
        id: z.string().min(1).describe("Column id, from columns_list or board_get"),
      }),
      annotations: { idempotentHint: true },
    },
    async ({ id, ...input }) =>
      withToolErrors(() => setColumnCategory(userId, id, input)),
  );

  server.registerTool(
    "column_reorder",
    {
      title: "Reorder column",
      description:
        "Moves a column to a new index within the free zone. Fails on the entry column and the two fixed terminal columns, which cannot be reordered.",
      inputSchema: ReorderColumnSchema.extend({
        id: z.string().min(1).describe("Column id, from columns_list or board_get"),
      }),
      annotations: { idempotentHint: true },
    },
    async ({ id, ...input }) => withToolErrors(() => reorderColumn(userId, id, input)),
  );

  server.registerTool(
    "column_delete",
    {
      title: "Delete column",
      description:
        "Deletes a column. Fails if the column is a default column or still contains applications — move or delete every application in it first.",
      inputSchema: z.object({
        id: z.string().min(1).describe("Column id, from columns_list or board_get"),
      }),
      annotations: { destructiveHint: true },
    },
    async ({ id }) => withToolErrors(() => deleteColumn(userId, id)),
  );
}
