import { McpServer } from "@modelcontextprotocol/server";

import { registerAiWatchTools } from "./tools/ai-watch";
import { registerBoardTools } from "./tools/board";
import { registerColumnTools } from "./tools/column";
import { registerProfileTools } from "./tools/profile";

/**
 * Construit un McpServer scopé à `userId` — appelé une fois par requête HTTP
 * (mode stateless). N'expose jamais `resolveLlmCredential` / `llmCredentials.apiKey`
 * (clé LLM en clair) : aucun tool, resource ou message d'erreur ne doit s'en approcher.
 */
export function buildDreamTrackServer(userId: string): McpServer {
  const server = new McpServer({ name: "dreamtrack", version: "1.0.0" });

  registerBoardTools(server, userId);
  registerColumnTools(server, userId);
  registerProfileTools(server, userId);
  registerAiWatchTools(server, userId);

  return server;
}
