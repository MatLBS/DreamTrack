import { describe, expect, it } from "vitest";

import { createApplication, moveApplication } from "@/services/application";
import {
  createColumn,
  deleteColumn,
  getColumns,
  renameColumn,
  reorderColumn,
  setColumnCategory,
} from "@/services/column";
import { ServiceError } from "@/services/errors";

describe("column service", () => {
  it("seeds the 6 default columns in order", async () => {
    const columns = await getColumns();
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
    const columns = await getColumns();
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

  describe("createColumn", () => {
    it("inserts a column in the free zone and shifts the following columns", async () => {
      const created = await createColumn({ name: "Interviewing", index: 2 });
      expect(created.name).toBe("Interviewing");
      expect(created.position).toBe(2);

      const columns = await getColumns();
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
      await expect(createColumn({ name: "Nope", index: 0 })).rejects.toThrow(
        ServiceError,
      );
    });

    it("rejects an index inside the terminal zone", async () => {
      // 6 columns exist: valid indices are 1..4
      await expect(createColumn({ name: "Nope", index: 5 })).rejects.toThrow(
        ServiceError,
      );
    });
  });

  describe("renameColumn", () => {
    it("renames a column, including default ones", async () => {
      const [entry] = await getColumns();
      const renamed = await renameColumn(entry.id, { name: "Applied" });
      expect(renamed.name).toBe("Applied");
    });

    it("throws NOT_FOUND for an unknown id", async () => {
      await expect(renameColumn("unknown-id", { name: "X" })).rejects.toThrow(
        ServiceError,
      );
    });
  });

  describe("reorderColumn", () => {
    it("moves a default intermediate column within the free zone", async () => {
      const before = await getColumns();
      const rejections = before.find((c) => c.name === "Rejections")!;

      await reorderColumn(rejections.id, { index: 3 });

      const after = await getColumns();
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
      const [entry] = await getColumns();
      await expect(reorderColumn(entry.id, { index: 2 })).rejects.toThrow(
        ServiceError,
      );
    });

    it("rejects moving a terminal column", async () => {
      const columns = await getColumns();
      const accepted = columns.find((c) => c.name === "Accepted")!;
      await expect(reorderColumn(accepted.id, { index: 2 })).rejects.toThrow(
        ServiceError,
      );
    });
  });

  describe("setColumnCategory", () => {
    it("toggles a non-entry column to lost (red)", async () => {
      const columns = await getColumns();
      const replies = columns.find((c) => c.name === "Replies")!;

      const updated = await setColumnCategory(replies.id, {
        isLostStage: true,
      });
      expect(updated.isLostStage).toBe(true);
    });

    it("rejects changing the entry column's category", async () => {
      const [entry] = await getColumns();
      await expect(
        setColumnCategory(entry.id, { isLostStage: true }),
      ).rejects.toThrow(ServiceError);
    });

    it("throws NOT_FOUND for an unknown id", async () => {
      await expect(
        setColumnCategory("unknown-id", { isLostStage: true }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe("deleteColumn", () => {
    it("rejects deleting a default column", async () => {
      const [entry] = await getColumns();
      await expect(deleteColumn(entry.id)).rejects.toThrow(ServiceError);
    });

    it("rejects deleting a non-empty custom column", async () => {
      const created = await createColumn({ name: "Interviewing", index: 2 });
      const application = await createApplication({
        company: "Acme",
        role: "SWE",
      });
      await moveApplication(application.id, {
        toColumnId: created.id,
        toIndex: 0,
      });

      await expect(deleteColumn(created.id)).rejects.toThrow(ServiceError);
    });

    it("deletes an empty custom column and closes the gap", async () => {
      const created = await createColumn({ name: "Interviewing", index: 2 });
      await deleteColumn(created.id);

      const columns = await getColumns();
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
});
