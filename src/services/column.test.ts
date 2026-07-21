import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { user } from "@/db/schema";
import { createApplication, moveApplication } from "@/services/application";
import {
  createColumn,
  deleteColumn,
  ensureDefaultColumns,
  getColumns,
  renameColumn,
  reorderColumn,
  setColumnCategory,
} from "@/services/column";
import { ServiceError } from "@/services/errors";
import { TEST_USER_ID } from "@/test/setup";

describe("column service", () => {
  it("seeds the 6 default columns in order", async () => {
    const columns = await getColumns(TEST_USER_ID);
    expect(columns.map((c) => c.name)).toEqual([
      "Jobs applied to",
      "Replies",
      "Rejections",
      "No reply",
      "Accepted",
      "Rejected",
    ]);
    expect(columns.every((c) => c.isDefault)).toBe(true);
  });

  it("assigns the expected default categories (green/red)", async () => {
    const columns = await getColumns(TEST_USER_ID);
    const isLostStageByName = Object.fromEntries(
      columns.map((c) => [c.name, c.isLostStage]),
    );
    expect(isLostStageByName).toEqual({
      "Jobs applied to": false,
      Replies: false,
      Rejections: true,
      "No reply": true,
      Accepted: false,
      Rejected: true,
    });
  });

  it("flags only the No reply column as isNoReplyStage", async () => {
    const columns = await getColumns(TEST_USER_ID);
    const isNoReplyStageByName = Object.fromEntries(
      columns.map((c) => [c.name, c.isNoReplyStage]),
    );
    expect(isNoReplyStageByName).toEqual({
      "Jobs applied to": false,
      Replies: false,
      Rejections: false,
      "No reply": true,
      Accepted: false,
      Rejected: false,
    });
  });

  describe("createColumn", () => {
    it("inserts a column in the free zone and shifts the following columns", async () => {
      const created = await createColumn(TEST_USER_ID, {
        name: "Interviewing",
        index: 2,
      });
      expect(created.name).toBe("Interviewing");
      expect(created.position).toBe(2);

      const columns = await getColumns(TEST_USER_ID);
      expect(columns.map((c) => c.name)).toEqual([
        "Jobs applied to",
        "Replies",
        "Interviewing",
        "Rejections",
        "No reply",
        "Accepted",
        "Rejected",
      ]);
    });

    it("rejects an index before the entry column (index 0)", async () => {
      await expect(
        createColumn(TEST_USER_ID, { name: "Nope", index: 0 }),
      ).rejects.toThrow(ServiceError);
    });

    it("rejects an index inside the terminal zone", async () => {
      // 6 columns exist: valid indices are 1..4
      await expect(
        createColumn(TEST_USER_ID, { name: "Nope", index: 5 }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe("renameColumn", () => {
    it("renames a column, including default ones", async () => {
      const [entry] = await getColumns(TEST_USER_ID);
      const renamed = await renameColumn(TEST_USER_ID, entry.id, {
        name: "Applied",
      });
      expect(renamed.name).toBe("Applied");
    });

    it("throws NOT_FOUND for an unknown id", async () => {
      await expect(
        renameColumn(TEST_USER_ID, "unknown-id", { name: "X" }),
      ).rejects.toThrow(ServiceError);
      await expect(
        renameColumn(TEST_USER_ID, "unknown-id", { name: "X" }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe("reorderColumn", () => {
    it("moves a default intermediate column within the free zone", async () => {
      const before = await getColumns(TEST_USER_ID);
      const rejections = before.find((c) => c.name === "Rejections")!;

      await reorderColumn(TEST_USER_ID, rejections.id, { index: 3 });

      const after = await getColumns(TEST_USER_ID);
      expect(after.map((c) => c.name)).toEqual([
        "Jobs applied to",
        "Replies",
        "No reply",
        "Rejections",
        "Accepted",
        "Rejected",
      ]);
    });

    it("rejects moving the entry column", async () => {
      const [entry] = await getColumns(TEST_USER_ID);
      await expect(
        reorderColumn(TEST_USER_ID, entry.id, { index: 2 }),
      ).rejects.toThrow(ServiceError);
      await expect(
        reorderColumn(TEST_USER_ID, entry.id, { index: 2 }),
      ).rejects.toThrow(ServiceError);
    });

    it("rejects moving a terminal column", async () => {
      const columns = await getColumns(TEST_USER_ID);
      const accepted = columns.find((c) => c.name === "Accepted")!;
      await expect(
        reorderColumn(TEST_USER_ID, accepted.id, { index: 2 }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe("setColumnCategory", () => {
    it("toggles a non-entry column to lost (red)", async () => {
      const columns = await getColumns(TEST_USER_ID);
      const replies = columns.find((c) => c.name === "Replies")!;

      const updated = await setColumnCategory(TEST_USER_ID, replies.id, {
        isLostStage: true,
      });
      expect(updated.isLostStage).toBe(true);
    });

    it("rejects changing the entry column's category", async () => {
      const [entry] = await getColumns(TEST_USER_ID);
      await expect(
        setColumnCategory(TEST_USER_ID, entry.id, { isLostStage: true }),
      ).rejects.toThrow(ServiceError);
    });

    it("throws NOT_FOUND for an unknown id", async () => {
      await expect(
        setColumnCategory(TEST_USER_ID, "unknown-id", { isLostStage: true }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe("deleteColumn", () => {
    it("rejects deleting a default column", async () => {
      const [entry] = await getColumns(TEST_USER_ID);
      await expect(deleteColumn(TEST_USER_ID, entry.id)).rejects.toThrow(
        ServiceError,
      );
    });

    it("rejects deleting a non-empty custom column", async () => {
      const created = await createColumn(TEST_USER_ID, {
        name: "Interviewing",
        index: 2,
      });
      const application = await createApplication(TEST_USER_ID, {
        company: "Acme",
        role: "SWE",
      });
      await moveApplication(TEST_USER_ID, application.id, {
        toColumnId: created.id,
        toIndex: 0,
      });

      await expect(deleteColumn(TEST_USER_ID, created.id)).rejects.toThrow(
        ServiceError,
      );
    });

    it("deletes an empty custom column and closes the gap", async () => {
      const created = await createColumn(TEST_USER_ID, {
        name: "Interviewing",
        index: 2,
      });
      await deleteColumn(TEST_USER_ID, created.id);

      const columns = await getColumns(TEST_USER_ID);
      expect(columns.map((c) => c.name)).toEqual([
        "Jobs applied to",
        "Replies",
        "Rejections",
        "No reply",
        "Accepted",
        "Rejected",
      ]);
    });
  });

  describe("multi-user isolation", () => {
    const OTHER_USER_ID = "other-column-test-user";

    beforeEach(async () => {
      await db
        .insert(user)
        .values({
          id: OTHER_USER_ID,
          name: "Other User",
          email: "other-column@example.com",
        })
        .onConflictDoNothing();
      // The global `beforeEach` in `src/test/setup.ts` wipes `columns` for
      // every user before each test — this user needs its own defaults too.
      await ensureDefaultColumns(OTHER_USER_ID);
    });

    it("keeps each user's columns independent", async () => {
      const mineBefore = await getColumns(TEST_USER_ID);

      await createColumn(OTHER_USER_ID, { name: "Interviewing", index: 2 });
      const othersColumns = await getColumns(OTHER_USER_ID);
      expect(othersColumns.map((c) => c.name)).toContain("Interviewing");

      const mineAfter = await getColumns(TEST_USER_ID);
      expect(mineAfter.map((c) => c.name)).toEqual(
        mineBefore.map((c) => c.name),
      );
    });

    it("cannot rename or delete another user's column", async () => {
      const [otherEntry] = await getColumns(OTHER_USER_ID);
      await expect(
        renameColumn(TEST_USER_ID, otherEntry.id, { name: "Hijacked" }),
      ).rejects.toThrow(ServiceError);

      const [, otherReplies] = await getColumns(OTHER_USER_ID);
      await expect(deleteColumn(TEST_USER_ID, otherReplies.id)).rejects.toThrow(
        ServiceError,
      );
    });
  });
});
