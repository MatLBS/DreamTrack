import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  CreateApplicationSchema,
  MoveApplicationSchema,
  SetApplicationFavoriteSchema,
  UpdateApplicationSchema,
} from "@/lib/validation/application";
import {
  createApplication,
  deleteApplication,
  getApplicationStats,
  getBoard,
  moveApplication,
  setApplicationFavorite,
  updateApplicationDetails,
} from "@/services/application";
import { getSankeyData } from "@/services/sankey";

import { withToolErrors } from "../errors";

export function registerBoardTools(server: McpServer, userId: string): void {
  server.registerTool(
    "board_get",
    {
      title: "Get board",
      description:
        "Returns every column with its id, name and position, and every application with its id, company, role, notes and current column. " +
        "Call this first — the id values it returns are required by application_update, application_move, application_set_favorite, application_delete, column_rename, column_set_category, column_reorder and column_delete.",
      annotations: { readOnlyHint: true },
    },
    async () =>
      withToolErrors(async () => {
        const board = await getBoard(userId);
        return board.map((column) => ({
          id: column.id,
          name: column.name,
          position: column.position,
          isDefault: column.isDefault,
          isLostStage: column.isLostStage,
          isNoReplyStage: column.isNoReplyStage,
          applications: column.applications.map((app) => ({
            id: app.id,
            company: app.company,
            role: app.role,
            url: app.url,
            notes: app.notes,
            isFavorite: app.isFavorite,
            daysInCurrentStep: app.daysInCurrentStep,
            createdAt: app.createdAt,
          })),
        }));
      }),
  );

  server.registerTool(
    "stats_get",
    {
      title: "Get application stats",
      description:
        "Returns aggregate stats: total applications, response rate, pending count, offers count.",
      annotations: { readOnlyHint: true },
    },
    async () => withToolErrors(() => getApplicationStats(userId)),
  );

  server.registerTool(
    "sankey_get",
    {
      title: "Get Sankey data",
      description:
        "Returns the aggregated flow between columns (nodes and links) built from every application's transition history. Shows where applications tend to progress or get stuck.",
      annotations: { readOnlyHint: true },
    },
    async () => withToolErrors(() => getSankeyData(userId)),
  );

  server.registerTool(
    "application_create",
    {
      title: "Create application",
      description:
        "Creates a new application card. If columnId is omitted, the card is placed in the entry column (first column). Writes a creation transition.",
      inputSchema: CreateApplicationSchema,
    },
    async (input) => withToolErrors(() => createApplication(userId, input)),
  );

  server.registerTool(
    "application_update",
    {
      title: "Update application",
      description:
        "Updates company/role/url/notes/iconUrl/isFavorite on an existing application. Does not write a transition and does not move the card between columns — use application_move for that.",
      inputSchema: UpdateApplicationSchema.extend({
        id: z.string().min(1).describe("Application id, from board_get"),
      }),
    },
    async ({ id, ...patch }) =>
      withToolErrors(() => updateApplicationDetails(userId, id, patch)),
  );

  server.registerTool(
    "application_move",
    {
      title: "Move application",
      description:
        "Moves an application to a column and position. toIndex is clamped to the column's valid range (0 = top). " +
        "If toColumnId differs from the application's current column, this writes a transition — the source of truth for the Sankey diagram.",
      inputSchema: MoveApplicationSchema.extend({
        id: z.string().min(1).describe("Application id, from board_get"),
      }),
      annotations: { destructiveHint: false },
    },
    async ({ id, ...input }) =>
      withToolErrors(() => moveApplication(userId, id, input)),
  );

  server.registerTool(
    "application_set_favorite",
    {
      title: "Set application favorite",
      description: "Sets or clears the favorite (star) flag on an application.",
      inputSchema: SetApplicationFavoriteSchema.extend({
        id: z.string().min(1).describe("Application id, from board_get"),
      }),
      annotations: { idempotentHint: true },
    },
    async ({ id, ...input }) =>
      withToolErrors(() => setApplicationFavorite(userId, id, input)),
  );

  server.registerTool(
    "application_delete",
    {
      title: "Delete application",
      description: "Permanently deletes an application and its transition history.",
      inputSchema: z.object({
        id: z.string().min(1).describe("Application id, from board_get"),
      }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ id }) => withToolErrors(() => deleteApplication(userId, id)),
  );
}
