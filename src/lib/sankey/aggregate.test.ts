import { describe, expect, it } from "vitest";

import type { Column, Transition } from "@/db/schema";

import { aggregateSankey } from "./aggregate";

function makeColumn(
  id: string,
  position: number,
  name = id,
  isLostStage = false,
): Column {
  return {
    id,
    name,
    position,
    isDefault: true,
    isLostStage,
    isNoReplyStage: false,
    createdAt: new Date(),
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

describe("aggregateSankey", () => {
  const a = makeColumn("a", 0, "Jobs applied to");
  const b = makeColumn("b", 1, "Replies");
  const c = makeColumn("c", 2, "Rejections", true);
  const columns = [a, b, c];

  it("returns empty nodes/links when there are no transitions", () => {
    expect(aggregateSankey(columns, [])).toEqual({ nodes: [], links: [] });
  });

  it("returns empty nodes/links for a card that was only created (never moved)", () => {
    const transitions = [makeTransition("app1", null, "a")];

    expect(aggregateSankey(columns, transitions)).toEqual({
      nodes: [],
      links: [],
    });
  });

  it("builds links along a card's net path", () => {
    const transitions = [
      makeTransition("app1", null, "a"),
      makeTransition("app1", "a", "b"),
      makeTransition("app1", "b", "c"),
    ];

    const { links } = aggregateSankey(columns, transitions);

    expect(links).toEqual(
      expect.arrayContaining([
        { source: "a", target: "b", value: 1 },
        { source: "b", target: "c", value: 1 },
      ]),
    );
    expect(links).toHaveLength(2);
  });

  it("counts transitions grouped by (from, to) pair across multiple cards", () => {
    const transitions = [
      makeTransition("app1", null, "a"),
      makeTransition("app1", "a", "b"),
      makeTransition("app2", null, "a"),
      makeTransition("app2", "a", "b"),
      makeTransition("app3", null, "a"),
      makeTransition("app3", "a", "c"),
    ];

    const { links } = aggregateSankey(columns, transitions);

    expect(links).toEqual(
      expect.arrayContaining([
        { source: "a", target: "b", value: 2 },
        { source: "a", target: "c", value: 1 },
      ]),
    );
    expect(links).toHaveLength(2);
  });

  it("rewinds a strict back-and-forth (A -> B -> A) leaving no trace of B", () => {
    const transitions = [
      makeTransition("app1", null, "a"),
      makeTransition("app1", "a", "b"),
      makeTransition("app1", "b", "a"),
    ];

    const { links, nodes } = aggregateSankey(columns, transitions);

    expect(links).toEqual([]);
    expect(nodes).toEqual([]);
  });

  it("positionally rewinds a corrected detour (A -> C -> B) even though B was never visited", () => {
    const transitions = [
      makeTransition("app1", null, "a"),
      makeTransition("app1", "a", "c"),
      makeTransition("app1", "c", "b"),
    ];

    const { links, nodes } = aggregateSankey(columns, transitions);

    expect(links).toEqual([{ source: "a", target: "b", value: 1 }]);
    expect(nodes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("computes cardCount as presence + passage without double counting", () => {
    const transitions = [
      makeTransition("app1", null, "a"),
      makeTransition("app1", "a", "b"),
      makeTransition("app2", null, "a"),
    ];

    const { nodes } = aggregateSankey(columns, transitions);

    expect(nodes.find((n) => n.id === "a")?.cardCount).toBe(2);
    expect(nodes.find((n) => n.id === "b")?.cardCount).toBe(1);
  });

  it("ignores transitions targeting an unknown (deleted) column without breaking the path", () => {
    const transitions = [
      makeTransition("app1", null, "a"),
      makeTransition("app1", "a", "deleted-column"),
      makeTransition("app1", "deleted-column", "b"),
    ];

    const { links } = aggregateSankey(columns, transitions);

    expect(links).toEqual([{ source: "a", target: "b", value: 1 }]);
  });

  it("seeds the path from the first fromColumnId when no creation event was recorded", () => {
    const transitions = [makeTransition("app1", "a", "b")];

    const { links } = aggregateSankey(columns, transitions);

    expect(links).toEqual([{ source: "a", target: "b", value: 1 }]);
  });

  it("only includes nodes referenced by at least one link, ordered by position", () => {
    const transitions = [
      makeTransition("app1", null, "b"),
      makeTransition("app1", "b", "c"),
    ];

    const { nodes } = aggregateSankey(columns, transitions);

    expect(nodes).toEqual([
      {
        id: "b",
        name: "Replies",
        position: 1,
        isLostStage: false,
        cardCount: 1,
      },
      {
        id: "c",
        name: "Rejections",
        position: 2,
        isLostStage: true,
        cardCount: 1,
      },
    ]);
  });

  it("propagates isLostStage from the column onto its Sankey node", () => {
    const transitions = [
      makeTransition("app1", null, "a"),
      makeTransition("app1", "a", "b"),
      makeTransition("app2", null, "a"),
      makeTransition("app2", "a", "c"),
    ];

    const { nodes } = aggregateSankey(columns, transitions);

    expect(nodes.find((n) => n.id === "b")?.isLostStage).toBe(false);
    expect(nodes.find((n) => n.id === "c")?.isLostStage).toBe(true);
  });
});
