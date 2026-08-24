import { createMcpHandler } from "@modelcontextprotocol/server";

import { buildDreamTrackServer } from "@/lib/mcp/server";
import { resolveUserIdFromToken } from "@/services/api-key";

// Le SDK utilise des API Node (le binding natif libSQL, node:crypto) — pas de edge runtime.
export const runtime = "nodejs";
// Chaque requête est authentifiée indépendamment : jamais de cache.
export const dynamic = "force-dynamic";

const handler = createMcpHandler((ctx) => {
  // `authInfo.clientId` porte le userId résolu par `route()` ci-dessous — voir
  // `McpHandlerRequestOptions.authInfo`, passé explicitement à `handler.fetch`.
  const userId = ctx.authInfo?.clientId;
  if (!userId) {
    throw new Error("buildDreamTrackServer called without a resolved userId");
  }
  return buildDreamTrackServer(userId);
});

function unauthorized(): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null },
    {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="DreamTrack MCP"' },
    },
  );
}

async function route(request: Request): Promise<Response> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return unauthorized();

  const userId = await resolveUserIdFromToken(token);
  if (userId === null) return unauthorized();

  return handler.fetch(request, {
    authInfo: { token, clientId: userId, scopes: ["mcp"] },
  });
}

export const POST = route;
export const GET = route;
export const DELETE = route;
