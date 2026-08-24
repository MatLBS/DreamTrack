import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { user } from "@/db/schema";
import { createApiKey, revokeApiKeyForUser } from "@/services/api-key";
import { createApplication } from "@/services/application";
import { TEST_USER_ID } from "@/test/setup";

import { DELETE, GET, POST } from "./route";

const OTHER_USER_ID = "mcp-route-other-user";

async function ensureOtherUser() {
  await db
    .insert(user)
    .values({ id: OTHER_USER_ID, name: "Other User", email: "mcp-other@example.com" })
    .onConflictDoNothing();
}

function rpc(body: unknown, token?: string) {
  return new Request("http://localhost:3000/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** Le transport streame par défaut (SSE) même pour une réponse ponctuelle —
 * on extrait le JSON-RPC du dernier événement `data:`, et on échoue
 * immédiatement si la réponse porte une erreur plutôt qu'un résultat. */
async function readRpcResult(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  const dataLines = text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length));
  const lastLine = dataLines.at(-1);
  if (!lastLine) {
    throw new Error(`No SSE data line in response body: ${text}`);
  }
  const parsed: JsonRpcResponse = JSON.parse(lastLine);
  if (parsed.result === undefined) {
    throw new Error(`Expected a JSON-RPC result, got: ${JSON.stringify(parsed)}`);
  }
  return parsed.result;
}

describe("POST /mcp — authentication", () => {
  it("returns 401 with no Authorization header", async () => {
    const response = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Bearer");
  });

  it("returns 401 for a malformed bearer token", async () => {
    const response = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, "garbage"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 for a revoked key", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "revoked key" });
    await revokeApiKeyForUser(TEST_USER_ID, created.id);
    const response = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, created.token),
    );
    expect(response.status).toBe(401);
  });
});

describe("POST /mcp — methods", () => {
  it("401s on an unauthenticated GET (auth is checked before method routing)", async () => {
    const response = await GET(
      new Request("http://localhost:3000/mcp", { method: "GET" }),
    );
    expect(response.status).toBe(401);
  });

  it("401s on an unauthenticated DELETE (auth is checked before method routing)", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/mcp", { method: "DELETE" }),
    );
    expect(response.status).toBe(401);
  });

  it("405s on GET once authenticated (stateless mode has no standing SSE stream)", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    const response = await GET(
      new Request("http://localhost:3000/mcp", {
        method: "GET",
        headers: { authorization: `Bearer ${created.token}` },
      }),
    );
    expect(response.status).toBe(405);
  });

  it("405s on DELETE once authenticated (stateless mode has no session to tear down)", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    const response = await DELETE(
      new Request("http://localhost:3000/mcp", {
        method: "DELETE",
        headers: { authorization: `Bearer ${created.token}` },
      }),
    );
    expect(response.status).toBe(405);
  });
});

describe("POST /mcp — protocol", () => {
  it("initialize succeeds with a valid key", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    const response = await POST(
      rpc(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        },
        created.token,
      ),
    );
    expect(response.status).toBe(200);
    const result = await readRpcResult(response);
    const serverInfo = result.serverInfo as { name: string };
    expect(serverInfo.name).toBe("dreamtrack");
  });

  it("tools/list contains the expected tool set", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    const response = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, created.token),
    );
    const result = await readRpcResult(response);
    const tools = result.tools as { name: string }[];
    const names = tools.map((tool) => tool.name).sort();

    expect(names).toEqual(
      [
        "ai_watch_dismiss_offer",
        "ai_watch_get_config",
        "ai_watch_list_offers",
        "ai_watch_save_config",
        "ai_watch_trigger_run",
        "application_create",
        "application_delete",
        "application_move",
        "application_set_favorite",
        "application_update",
        "board_get",
        "column_create",
        "column_delete",
        "column_rename",
        "column_reorder",
        "column_set_category",
        "columns_list",
        "profile_get",
        "profile_update",
        "sankey_get",
        "stats_get",
      ].sort(),
    );
  });

  it("tools/call board_get returns the seeded default columns with ids", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    const response = await POST(
      rpc(
        { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "board_get", arguments: {} } },
        created.token,
      ),
    );
    const result = await readRpcResult(response);
    const content = result.content as { text: string }[];
    const board = JSON.parse(content[0].text);
    expect(board.length).toBeGreaterThan(0);
    expect(board[0]).toHaveProperty("id");
    expect(board[0]).toHaveProperty("applications");
  });

  it("tools/call with a bogus column id returns isError, not an HTTP error", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    const [application] = await Promise.all([createApplication(TEST_USER_ID, {
      company: "Acme",
      role: "Engineer",
    })]);

    const response = await POST(
      rpc(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "application_move",
            arguments: { id: application.id, toColumnId: "does-not-exist", toIndex: 0 },
          },
        },
        created.token,
      ),
    );
    expect(response.status).toBe(200);
    const result = await readRpcResult(response);
    const content = result.content as { text: string }[];
    expect(result.isError).toBe(true);
    expect(content[0].text).toContain("COLUMN_NOT_FOUND");
  });

  it("isolates users: user B never sees user A's applications via board_get", async () => {
    await ensureOtherUser();
    await createApplication(TEST_USER_ID, { company: "UserA Co", role: "Dev" });

    const otherKey = await createApiKey(OTHER_USER_ID, { name: "other key" });
    const response = await POST(
      rpc(
        { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "board_get", arguments: {} } },
        otherKey.token,
      ),
    );
    const result = await readRpcResult(response);
    const content = result.content as { text: string }[];
    const board = JSON.parse(content[0].text);
    const allApplications = board.flatMap((column: { applications: unknown[] }) => column.applications);
    expect(JSON.stringify(allApplications)).not.toContain("UserA Co");
  });
});
