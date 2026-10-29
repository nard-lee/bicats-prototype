import { describe, expect, it } from "vitest";

import {
  clearRecentReferences,
  loadRecentReferences,
  rememberReference,
} from "./reference";

describe("recent complaint references", () => {
  it("keeps the latest reference first and removes duplicates", () => {
    rememberReference("26-10-0001");
    rememberReference("26-10-0002");
    rememberReference("26-10-0001");

    expect(loadRecentReferences()).toEqual([
      "26-10-0001",
      "26-10-0002",
    ]);
  });

  it("caps the list at five entries", () => {
    for (let index = 1; index <= 7; index += 1) {
      rememberReference(`26-10-000${index}`);
    }

    expect(loadRecentReferences()).toHaveLength(5);
    expect(loadRecentReferences()[0]).toBe("26-10-0007");
  });

  it("ignores corrupted storage and clears on demand", () => {
    localStorage.setItem("bicats:tracked-references", "{not json");

    expect(loadRecentReferences()).toEqual([]);

    rememberReference("26-10-0003");
    clearRecentReferences();

    expect(loadRecentReferences()).toEqual([]);
  });
});
