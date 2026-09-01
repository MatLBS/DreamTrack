import type { CallToolResult } from "@modelcontextprotocol/server";

import { ServiceError, type ServiceErrorCode } from "@/services/errors";

/** Ce que l'agent doit faire pour chaque code — le message compte plus que le code. */
const RECOVERY_HINTS: Partial<Record<ServiceErrorCode, string>> = {
  VALIDATION:
    "The input did not match the expected schema. Check the field constraints and retry.",
  COLUMN_NOT_FOUND:
    "No column with that id. Call board_get to list valid column ids.",
  APPLICATION_NOT_FOUND:
    "No application with that id. Call board_get to list valid application ids.",
  COLUMN_NOT_EMPTY:
    "Move or delete every application in this column first, then retry.",
  DEFAULT_COLUMN_DELETE:
    "Default columns cannot be deleted. Rename it instead with column_rename.",
  PROTECTED_COLUMN_REORDER:
    "The entry column and the two terminal columns cannot be reordered.",
  ENTRY_COLUMN_CATEGORY:
    "The entry column has a fixed category and cannot be changed.",
  NO_COLUMNS: "This user has no columns yet.",
  AI_WATCH_RUN_IN_PROGRESS:
    "A run is already in progress. Poll ai_watch_get_config instead of retrying.",
  AI_WATCH_CONFIG_NOT_FOUND:
    "No AI Watch config. Call ai_watch_save_config first.",
  OFFER_NOT_FOUND:
    "No offer with that id. Call ai_watch_list_offers for valid ids.",
  LLM_KEY_MISSING:
    "No LLM API key is configured. The user must add one in the DreamTrack profile page — it cannot be set over MCP.",
};

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/** Exécute un tool MCP et convertit toute erreur en résultat `isError: true`
 * plutôt qu'en exception protocolaire — l'agent peut ainsi lire le message et
 * réessayer. Les erreurs inattendues ne fuient jamais leur détail interne. */
export async function withToolErrors<T>(
  fn: () => Promise<T>,
): Promise<CallToolResult> {
  try {
    return jsonResult(await fn());
  } catch (error) {
    if (error instanceof ServiceError) {
      const hint = RECOVERY_HINTS[error.code];
      return {
        content: [
          {
            type: "text",
            text: `${error.code}: ${error.message}${hint ? `\n\n${hint}` : ""}`,
          },
        ],
        isError: true,
      };
    }
    console.error("[mcp] unexpected tool error", error);
    return {
      content: [
        { type: "text", text: "INTERNAL_ERROR: an unexpected error occurred." },
      ],
      isError: true,
    };
  }
}
