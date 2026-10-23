import { describe, expect, it } from "vitest";

import {
  clearRecentReferences,
  loadRecentReferences,
  rememberReference,
} from "./reference";

describe("recent complaint references", () => {
  it("keeps the latest reference first and removes duplicates", () => {
    rememberReference("BK-2026-000001-K7");
    rememberReference("BK-2026-000002-M3");
    rememberReference("BK-2026-000001-K7");

    expect(loadRecentReferences()).toEqual([
      "BK-2026-000001-K7",
      "BK-2026-000002-M3",
    ]);
  });

  it("caps the list at five entries", () => {
    for (let index = 1; index <= 7; index += 1) {
      rememberReference(`BK-2026-00000${index}-AA`);
    }

    expect(loadRecentReferences()).toHaveLength(5);
    expect(loadRecentReferences()[0]).toBe("BK-2026-000007-AA");
  });

  it("ignores corrupted storage and clears on demand", () => {
    localStorage.setItem("bicats:tracked-references", "{not json");

    expect(loadRecentReferences()).toEqual([]);

    rememberReference("BK-2026-000003-Q4");
    clearRecentReferences();

    expect(loadRecentReferences()).toEqual([]);
  });
});
