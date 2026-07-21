import { describe, expect, it } from "vitest";

import type { Column } from "@/db/schema";

import { findAcceptedColumn } from "./terminal-columns";

function makeColumn(id: string, position: number, isLostStage = false): Column {
  return {
    id,
    name: id,
    position,
    isDefault: true,
    isLostStage,
    isNoReplyStage: false,
    createdAt: new Date(),
  };
}

describe("findAcceptedColumn", () => {
  it("returns the non-lost column among the last two (terminal) columns", () => {
    const entry = makeColumn("entry", 0);
    const replies = makeColumn("replies", 1);
    const rejections = makeColumn("rejections", 2, true);
    const accepted = makeColumn("accepted", 3);
    const rejected = makeColumn("rejected", 4, true);

    expect(
      findAcceptedColumn([entry, replies, rejections, accepted, rejected]),
    ).toBe(accepted);
  });

  it("is order-independent (sorts by position first)", () => {
    const accepted = makeColumn("accepted", 3);
    const rejected = makeColumn("rejected", 4, true);
    const entry = makeColumn("entry", 0);

    expect(findAcceptedColumn([rejected, entry, accepted])).toBe(accepted);
  });

  it("returns undefined when both terminal columns are lost stages", () => {
    const entry = makeColumn("entry", 0);
    const rejectedA = makeColumn("rejected-a", 1, true);
    const rejectedB = makeColumn("rejected-b", 2, true);

    expect(findAcceptedColumn([entry, rejectedA, rejectedB])).toBeUndefined();
  });

  it("returns undefined for an empty board", () => {
    expect(findAcceptedColumn([])).toBeUndefined();
  });
});
