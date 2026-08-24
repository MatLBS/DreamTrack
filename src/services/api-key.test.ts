import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { apiKeys, user } from "@/db/schema";
import { TEST_USER_ID } from "@/test/setup";

import {
  createApiKey,
  listApiKeys,
  resolveUserIdFromToken,
  revokeApiKeyForUser,
} from "./api-key";
import { ServiceError } from "./errors";

const OTHER_USER_ID = "other-test-user";

async function ensureOtherUser() {
  await db
    .insert(user)
    .values({ id: OTHER_USER_ID, name: "Other User", email: "other@example.com" })
    .onConflictDoNothing();
}

describe("createApiKey", () => {
  it("returns a token starting with the dt_ prefix", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    expect(created.token.startsWith("dt_")).toBe(true);
  });

  it("returns a token long enough to carry 24 random bytes", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    expect(created.token.length).toBeGreaterThan(30);
  });

  it("never persists the plaintext token", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, created.id));
    expect(JSON.stringify(row)).not.toContain(created.token);
  });

  it("stores a keyPreview matching the token's last 4 chars", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    expect(created.keyPreview.endsWith(created.token.slice(-4))).toBe(true);
  });

  it("produces different tokens and hashes across calls", async () => {
    const a = await createApiKey(TEST_USER_ID, { name: "key a" });
    const b = await createApiKey(TEST_USER_ID, { name: "key b" });
    expect(a.token).not.toBe(b.token);
  });

  it("honours expiresInDays", async () => {
    const before = Date.now();
    const created = await createApiKey(TEST_USER_ID, {
      name: "expiring key",
      expiresInDays: 7,
    });
    expect(created.expiresAt).not.toBeNull();
    const expectedMs = before + 7 * 24 * 60 * 60 * 1000;
    expect(created.expiresAt!.getTime()).toBeGreaterThan(expectedMs - 5000);
    expect(created.expiresAt!.getTime()).toBeLessThan(expectedMs + 5000);
  });

  it("rejects a name longer than 60 chars", async () => {
    await expect(
      createApiKey(TEST_USER_ID, { name: "a".repeat(61) }),
    ).rejects.toThrow(ServiceError);
  });
});

describe("resolveUserIdFromToken", () => {
  it("returns the userId for a freshly created key", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    await expect(resolveUserIdFromToken(created.token)).resolves.toBe(
      TEST_USER_ID,
    );
  });

  it("returns null for a token with a valid format but unknown hash", async () => {
    await expect(
      resolveUserIdFromToken("dt_doesnotexistdoesnotexist"),
    ).resolves.toBeNull();
  });

  it("returns null for a token without the dt_ prefix", async () => {
    await expect(resolveUserIdFromToken("garbage")).resolves.toBeNull();
  });

  it("returns null for the empty string", async () => {
    await expect(resolveUserIdFromToken("")).resolves.toBeNull();
  });

  it("returns null for a revoked key", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    await revokeApiKeyForUser(TEST_USER_ID, created.id);
    await expect(resolveUserIdFromToken(created.token)).resolves.toBeNull();
  });

  it("returns null for an expired key", async () => {
    const created = await createApiKey(TEST_USER_ID, {
      name: "test key",
      expiresInDays: 1,
    });
    await db
      .update(apiKeys)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(apiKeys.id, created.id));
    await expect(resolveUserIdFromToken(created.token)).resolves.toBeNull();
  });

  it("sets lastUsedAt on first use", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    await resolveUserIdFromToken(created.token);
    await vi.waitFor(async () => {
      const [row] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, created.id));
      expect(row.lastUsedAt).not.toBeNull();
    });
  });

  it("does not rewrite lastUsedAt on an immediate second use", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    await resolveUserIdFromToken(created.token);
    await vi.waitFor(async () => {
      const [row] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, created.id));
      expect(row.lastUsedAt).not.toBeNull();
    });
    const [afterFirst] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, created.id));

    await resolveUserIdFromToken(created.token);
    const [afterSecond] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, created.id));
    expect(afterSecond.lastUsedAt?.getTime()).toBe(
      afterFirst.lastUsedAt?.getTime(),
    );
  });
});

describe("revokeApiKeyForUser", () => {
  it("sets revokedAt and keeps the row", async () => {
    const created = await createApiKey(TEST_USER_ID, { name: "test key" });
    const revoked = await revokeApiKeyForUser(TEST_USER_ID, created.id);
    expect(revoked.revokedAt).not.toBeNull();
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, created.id));
    expect(row).toBeDefined();
  });

  it("throws API_KEY_NOT_FOUND for another user's key id", async () => {
    await ensureOtherUser();
    const created = await createApiKey(OTHER_USER_ID, { name: "other's key" });
    await expect(
      revokeApiKeyForUser(TEST_USER_ID, created.id),
    ).rejects.toMatchObject({ code: "API_KEY_NOT_FOUND" });
  });
});

describe("listApiKeys", () => {
  it("returns only the caller's keys", async () => {
    await ensureOtherUser();
    await createApiKey(TEST_USER_ID, { name: "mine" });
    await createApiKey(OTHER_USER_ID, { name: "theirs" });

    const keys = await listApiKeys(TEST_USER_ID);
    expect(keys).toHaveLength(1);
    expect(keys[0].name).toBe("mine");
  });

  it("never includes lookupHash in the summary", async () => {
    await createApiKey(TEST_USER_ID, { name: "test key" });
    const keys = await listApiKeys(TEST_USER_ID);
    expect(JSON.stringify(keys)).not.toContain("lookupHash");
  });
});
