import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { transitions } from "@/db/schema";
import {
  createApplication,
  deleteApplication,
  getBoard,
  moveApplication,
  updateApplicationDetails,
} from "@/services/application";
import { getColumns } from "@/services/column";
import { ServiceError } from "@/services/errors";

describe("application service", () => {
  describe("createApplication", () => {
    it("creates the card in the entry column and writes the creation transition", async () => {
      const [entry] = await getColumns();
      const application = await createApplication({
        company: "Acme",
        role: "SWE",
      });

      expect(application.columnId).toBe(entry.id);
      expect(application.position).toBe(0);

      const rows = await db
        .select()
        .from(transitions)
        .where(eq(transitions.applicationId, application.id));
      expect(rows).toHaveLength(1);
      expect(rows[0].fromColumnId).toBeNull();
      expect(rows[0].toColumnId).toBe(entry.id);
    });

    it("appends subsequent cards after existing ones", async () => {
      await createApplication({ company: "A", role: "R1" });
      const second = await createApplication({ company: "B", role: "R2" });
      expect(second.position).toBe(1);
    });

    it("creates the card directly in the given column when columnId is provided", async () => {
      const columns = await getColumns();
      const replies = columns.find((c) => c.name === "Replies")!;

      const application = await createApplication({
        company: "Acme",
        role: "SWE",
        columnId: replies.id,
      });

      expect(application.columnId).toBe(replies.id);
      expect(application.position).toBe(0);

      const rows = await db
        .select()
        .from(transitions)
        .where(eq(transitions.applicationId, application.id));
      expect(rows).toHaveLength(1);
      expect(rows[0].fromColumnId).toBeNull();
      expect(rows[0].toColumnId).toBe(replies.id);
    });

    it("throws NOT_FOUND when columnId does not exist", async () => {
      await expect(
        createApplication({
          company: "Acme",
          role: "SWE",
          columnId: "unknown-column",
        }),
      ).rejects.toThrow(ServiceError);
    });

    it("stores the icon URL when provided", async () => {
      const application = await createApplication({
        company: "Acme",
        role: "SWE",
        iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      });
      expect(application.iconUrl).toBe(
        "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      );
    });
  });

  describe("moveApplication", () => {
    it("moves a card across columns and writes a from→to transition", async () => {
      const columns = await getColumns();
      const replies = columns.find((c) => c.name === "Replies")!;
      const application = await createApplication({
        company: "Acme",
        role: "SWE",
      });

      const moved = await moveApplication(application.id, {
        toColumnId: replies.id,
        toIndex: 0,
      });

      expect(moved.columnId).toBe(replies.id);
      expect(moved.position).toBe(0);

      const rows = await db
        .select()
        .from(transitions)
        .where(eq(transitions.applicationId, application.id));
      expect(rows).toHaveLength(2);
      const moveTransition = rows.find((r) => r.fromColumnId !== null)!;
      expect(moveTransition.toColumnId).toBe(replies.id);
    });

    it("reorders within the same column without writing a transition", async () => {
      const first = await createApplication({ company: "A", role: "R1" });
      const second = await createApplication({ company: "B", role: "R2" });

      await moveApplication(second.id, {
        toColumnId: first.columnId,
        toIndex: 0,
      });

      const rowsForSecond = await db
        .select()
        .from(transitions)
        .where(eq(transitions.applicationId, second.id));
      expect(rowsForSecond).toHaveLength(1); // only the creation transition

      const board = await getBoard();
      const entryColumn = board.find((c) => c.id === first.columnId)!;
      expect(entryColumn.applications.map((a) => a.id)).toEqual([
        second.id,
        first.id,
      ]);
    });

    it("throws NOT_FOUND for an unknown application", async () => {
      const [entry] = await getColumns();
      await expect(
        moveApplication("unknown-id", { toColumnId: entry.id, toIndex: 0 }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe("updateApplicationDetails", () => {
    it("updates editable fields", async () => {
      const application = await createApplication({
        company: "Acme",
        role: "SWE",
      });
      const updated = await updateApplicationDetails(application.id, {
        notes: "Great fit",
      });
      expect(updated.notes).toBe("Great fit");
      expect(updated.company).toBe("Acme");
    });

    it("replaces the icon URL", async () => {
      const application = await createApplication({
        company: "Acme",
        role: "SWE",
        iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      });
      const updated = await updateApplicationDetails(application.id, {
        iconUrl: "/uploads/icons/22222222-2222-2222-2222-222222222222.svg",
      });
      expect(updated.iconUrl).toBe(
        "/uploads/icons/22222222-2222-2222-2222-222222222222.svg",
      );
    });

    it("clears the icon URL when explicitly set to null", async () => {
      const application = await createApplication({
        company: "Acme",
        role: "SWE",
        iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      });
      const updated = await updateApplicationDetails(application.id, {
        iconUrl: null,
      });
      expect(updated.iconUrl).toBeNull();
    });

    it("leaves the icon URL untouched when the field is omitted", async () => {
      const application = await createApplication({
        company: "Acme",
        role: "SWE",
        iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      });
      const updated = await updateApplicationDetails(application.id, {
        notes: "Great fit",
      });
      expect(updated.iconUrl).toBe(
        "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      );
    });
  });

  describe("deleteApplication", () => {
    it("deletes the card, cascades its transitions, and closes the gap", async () => {
      const first = await createApplication({ company: "A", role: "R1" });
      const second = await createApplication({ company: "B", role: "R2" });

      await deleteApplication(first.id);

      const board = await getBoard();
      const entryColumn = board.find((c) => c.id === first.columnId)!;
      expect(entryColumn.applications.map((a) => a.id)).toEqual([second.id]);
      expect(entryColumn.applications[0].position).toBe(0);

      const rows = await db
        .select()
        .from(transitions)
        .where(eq(transitions.applicationId, first.id));
      expect(rows).toHaveLength(0);
    });
  });
});
