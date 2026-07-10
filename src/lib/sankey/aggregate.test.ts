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
  fromColumnId: string | null,
  toColumnId: string,
): Transition {
  return {
    id: crypto.randomUUID(),
    applicationId: crypto.randomUUID(),
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

  it("counts transitions grouped by (from, to) pair", () => {
    const transitions = [
      makeTransition("a", "b"),
      makeTransition("a", "b"),
      makeTransition("a", "c"),
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

  it("excludes creation events (fromColumnId null)", () => {
    const transitions = [makeTransition(null, "a"), makeTransition("a", "b")];

    const { links, nodes } = aggregateSankey(columns, transitions);

    expect(links).toEqual([{ source: "a", target: "b", value: 1 }]);
    expect(nodes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("excludes backward transitions (toPosition <= fromPosition)", () => {
    const transitions = [makeTransition("a", "b"), makeTransition("c", "a")];

    const { links } = aggregateSankey(columns, transitions);

    expect(links).toEqual([{ source: "a", target: "b", value: 1 }]);
  });

  it("only includes nodes referenced by at least one link, ordered by position", () => {
    const transitions = [makeTransition("b", "c")];

    const { nodes } = aggregateSankey(columns, transitions);

    expect(nodes).toEqual([
      { id: "b", name: "Replies", position: 1, isLostStage: false },
      { id: "c", name: "Rejections", position: 2, isLostStage: true },
    ]);
  });

  it("propagates isLostStage from the column onto its Sankey node", () => {
    const transitions = [makeTransition("a", "b"), makeTransition("a", "c")];

    const { nodes } = aggregateSankey(columns, transitions);

    expect(nodes.find((n) => n.id === "b")?.isLostStage).toBe(false);
    expect(nodes.find((n) => n.id === "c")?.isLostStage).toBe(true);
  });

  it("returns empty nodes/links when there are no real transitions", () => {
    expect(aggregateSankey(columns, [])).toEqual({ nodes: [], links: [] });
  });
});
