import { describe, expect, it } from "vitest";

import { csvCell } from "./csv";

describe("csvCell", () => {
  it("quotes and escapes ordinary text", () => {
    expect(csvCell('Juan "Juaning" Cruz')).toBe('"Juan ""Juaning"" Cruz"');
  });

  it("neutralizes cells that start with a formula character", () => {
    for (const value of ["=1+1", "+SUM(A1)", "-2+3", "@SUM", "\tfoo", "\rfoo"]) {
      expect(csvCell(value)).toBe(`"'${value}"`);
    }
  });

  it("leaves formula characters inside the text alone", () => {
    expect(csvCell("Juan = Cruz")).toBe('"Juan = Cruz"');
  });
});
