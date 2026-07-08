import { describe, expect, it } from "vitest";

import type { Application, Column, Transition } from "@/db/schema";

import { aggregateStats } from "./aggregate";

function makeColumn(id: string, position: number, isLostStage = false): Column {
  return {
    id,
    name: id,
    position,
    isDefault: true,
    isLostStage,
    createdAt: new Date(),
  };
}

function makeApplication(id: string, columnId: string): Application {
  return {
    id,
    company: "Acme",
    role: "Engineer",
    url: null,
    notes: null,
    columnId,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeTransition(
  applicationId: string,
  fromColumnId: string | null,
  toColumnId: string,
): Transition {
  return {
    id: crypto.randomUUID(),
    applicationId,
    fromColumnId,
    toColumnId,
    createdAt: new Date(),
  };
}

describe("aggregateStats", () => {
  // entry(0) -> replies(1, ok) -> { rejections(2, lost), noReply(3, lost) }
  // terminal: accepted(4, ok) / rejected(5, lost)
  const entry = makeColumn("entry", 0);
  const replies = makeColumn("replies", 1);
  const rejections = makeColumn("rejections", 2, true);
  const noReply = makeColumn("no-reply", 3, true);
  const accepted = makeColumn("accepted", 4);
  const rejected = makeColumn("rejected", 5, true);
  const columns = [entry, replies, rejections, noReply, accepted, rejected];

  it("returns all zeros for an empty board", () => {
    expect(aggregateStats([], [], [])).toEqual({
      total: 0,
      responseRate: 0,
      pending: 0,
      offers: 0,
    });
    expect(aggregateStats(columns, [], [])).toEqual({
      total: 0,
      responseRate: 0,
      pending: 0,
      offers: 0,
    });
  });

  it("counts pending as applications still in the entry column", () => {
    const applications = [
      makeApplication("a1", "entry"),
      makeApplication("a2", "entry"),
      makeApplication("a3", "replies"),
    ];
    const stats = aggregateStats(columns, applications, []);
    expect(stats.pending).toBe(2);
    expect(stats.total).toBe(3);
  });

  it("counts offers as applications in the accepted (non-lost terminal) column", () => {
    const applications = [
      makeApplication("a1", "accepted"),
      makeApplication("a2", "rejected"),
      makeApplication("a3", "entry"),
    ];
    const stats = aggregateStats(columns, applications, []);
    expect(stats.offers).toBe(1);
  });

  it("does not count an application that only reached a lost stage as responded", () => {
    const applications = [makeApplication("a1", "no-reply")];
    const transitions = [
      makeTransition("a1", null, "entry"),
      makeTransition("a1", "entry", "no-reply"),
    ];
    const stats = aggregateStats(columns, applications, transitions);
    expect(stats.responseRate).toBe(0);
  });

  it("counts an application that reached a non-entry, non-lost column as responded", () => {
    const applications = [
      makeApplication("a1", "replies"),
      makeApplication("a2", "entry"),
    ];
    const transitions = [
      makeTransition("a1", null, "entry"),
      makeTransition("a1", "entry", "replies"),
      makeTransition("a2", null, "entry"),
    ];
    const stats = aggregateStats(columns, applications, transitions);
    expect(stats.responseRate).toBe(50);
  });

  it("counts an accepted application as responded", () => {
    const applications = [makeApplication("a1", "accepted")];
    const transitions = [
      makeTransition("a1", null, "entry"),
      makeTransition("a1", "entry", "replies"),
      makeTransition("a1", "replies", "accepted"),
    ];
    const stats = aggregateStats(columns, applications, transitions);
    expect(stats.responseRate).toBe(100);
  });
});
