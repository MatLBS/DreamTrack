import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { transitions, user } from "@/db/schema";
import {
  createApplication,
  deleteApplication,
  getBoard,
  moveApplication,
  setApplicationFavorite,
  updateApplicationDetails,
} from "@/services/application";
import { getColumns } from "@/services/column";
import { ServiceError } from "@/services/errors";
import { TEST_USER_ID } from "@/test/setup";

describe("application service", () => {
  describe("createApplication", () => {
    it("creates the card in the entry column and writes the creation transition", async () => {
      const [entry] = await getColumns(TEST_USER_ID);
      const application = await createApplication(TEST_USER_ID, {
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
      await createApplication(TEST_USER_ID, { company: "A", role: "R1" });
      const second = await createApplication(TEST_USER_ID, {
        company: "B",
        role: "R2",
      });
      expect(second.position).toBe(1);
    });

    it("creates the card directly in the given column when columnId is provided", async () => {
      const columns = await getColumns(TEST_USER_ID);
      const replies = columns.find((c) => c.name === "Replies")!;

      const application = await createApplication(TEST_USER_ID, {
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
        createApplication(TEST_USER_ID, {
          company: "Acme",
          role: "SWE",
          columnId: "unknown-column",
        }),
      ).rejects.toThrow(ServiceError);
    });

    it("stores the icon URL when provided", async () => {
      const application = await createApplication(TEST_USER_ID, {
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
      const columns = await getColumns(TEST_USER_ID);
      const replies = columns.find((c) => c.name === "Replies")!;
      const application = await createApplication(TEST_USER_ID, {
        company: "Acme",
        role: "SWE",
      });

      const moved = await moveApplication(TEST_USER_ID, application.id, {
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
      const first = await createApplication(TEST_USER_ID, {
        company: "A",
        role: "R1",
      });
      const second = await createApplication(TEST_USER_ID, {
        company: "B",
        role: "R2",
      });

      await moveApplication(TEST_USER_ID, second.id, {
        toColumnId: first.columnId,
        toIndex: 0,
      });

      const rowsForSecond = await db
        .select()
        .from(transitions)
        .where(eq(transitions.applicationId, second.id));
      expect(rowsForSecond).toHaveLength(1); // only the creation transition

      const board = await getBoard(TEST_USER_ID);
      const entryColumn = board.find((c) => c.id === first.columnId)!;
      expect(entryColumn.applications.map((a) => a.id)).toEqual([
        second.id,
        first.id,
      ]);
    });

    it("throws NOT_FOUND for an unknown application", async () => {
      const [entry] = await getColumns(TEST_USER_ID);
      await expect(
        moveApplication(TEST_USER_ID, "unknown-id", {
          toColumnId: entry.id,
          toIndex: 0,
        }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe("updateApplicationDetails", () => {
    it("updates editable fields", async () => {
      const application = await createApplication(TEST_USER_ID, {
        company: "Acme",
        role: "SWE",
      });
      const updated = await updateApplicationDetails(
        TEST_USER_ID,
        application.id,
        { notes: "Great fit" },
      );
      expect(updated.notes).toBe("Great fit");
      expect(updated.company).toBe("Acme");
    });

    it("replaces the icon URL", async () => {
      const application = await createApplication(TEST_USER_ID, {
        company: "Acme",
        role: "SWE",
        iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      });
      const updated = await updateApplicationDetails(
        TEST_USER_ID,
        application.id,
        { iconUrl: "/uploads/icons/22222222-2222-2222-2222-222222222222.svg" },
      );
      expect(updated.iconUrl).toBe(
        "/uploads/icons/22222222-2222-2222-2222-222222222222.svg",
      );
    });

    it("clears the icon URL when explicitly set to null", async () => {
      const application = await createApplication(TEST_USER_ID, {
        company: "Acme",
        role: "SWE",
        iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      });
      const updated = await updateApplicationDetails(
        TEST_USER_ID,
        application.id,
        { iconUrl: null },
      );
      expect(updated.iconUrl).toBeNull();
    });

    it("leaves the icon URL untouched when the field is omitted", async () => {
      const application = await createApplication(TEST_USER_ID, {
        company: "Acme",
        role: "SWE",
        iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      });
      const updated = await updateApplicationDetails(
        TEST_USER_ID,
        application.id,
        { notes: "Great fit" },
      );
      expect(updated.iconUrl).toBe(
        "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
      );
    });
  });

  describe("setApplicationFavorite", () => {
    it("marks a card as favorite and can unmark it, without writing a transition", async () => {
      const application = await createApplication(TEST_USER_ID, {
        company: "Acme",
        role: "SWE",
      });
      expect(application.isFavorite).toBe(false);

      const marked = await setApplicationFavorite(
        TEST_USER_ID,
        application.id,
        {
          isFavorite: true,
        },
      );
      expect(marked.isFavorite).toBe(true);

      const unmarked = await setApplicationFavorite(
        TEST_USER_ID,
        application.id,
        { isFavorite: false },
      );
      expect(unmarked.isFavorite).toBe(false);

      const rows = await db
        .select()
        .from(transitions)
        .where(eq(transitions.applicationId, application.id));
      expect(rows).toHaveLength(1); // only the creation transition
    });

    it("throws NOT_FOUND for an unknown application", async () => {
      await expect(
        setApplicationFavorite(TEST_USER_ID, "unknown-id", {
          isFavorite: true,
        }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe("deleteApplication", () => {
    it("deletes the card, cascades its transitions, and closes the gap", async () => {
      const first = await createApplication(TEST_USER_ID, {
        company: "A",
        role: "R1",
      });
      const second = await createApplication(TEST_USER_ID, {
        company: "B",
        role: "R2",
      });

      await deleteApplication(TEST_USER_ID, first.id);

      const board = await getBoard(TEST_USER_ID);
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

  describe("multi-user isolation", () => {
    const OTHER_USER_ID = "other-test-user";

    beforeAll(async () => {
      await db
        .insert(user)
        .values({
          id: OTHER_USER_ID,
          name: "Other User",
          email: "other@example.com",
        })
        .onConflictDoNothing();
    });

    it("does not show another user's board or let them mutate its cards", async () => {
      const mine = await createApplication(TEST_USER_ID, {
        company: "Mine",
        role: "SWE",
      });

      const otherBoard = await getBoard(OTHER_USER_ID);
      const otherEntry = otherBoard.find((c) => c.name === "Jobs applied to")!;
      expect(otherEntry.applications.some((a) => a.id === mine.id)).toBe(false);

      await expect(
        updateApplicationDetails(OTHER_USER_ID, mine.id, { notes: "hacked" }),
      ).rejects.toThrow(ServiceError);
      await expect(deleteApplication(OTHER_USER_ID, mine.id)).rejects.toThrow(
        ServiceError,
      );

      const myBoard = await getBoard(TEST_USER_ID);
      const myEntry = myBoard.find((c) => c.name === "Jobs applied to")!;
      expect(myEntry.applications.some((a) => a.id === mine.id)).toBe(true);
    });
  });
});
