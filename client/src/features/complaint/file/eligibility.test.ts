import { describe, expect, it } from "vitest";
import {
  EMPTY_ELIGIBILITY,
  evaluateIntakeEligibility,
  type EligibilityFormState,
} from "./eligibility";

function form(patch: Partial<EligibilityFormState>): EligibilityFormState {
  return {
    ...EMPTY_ELIGIBILITY,
    eligResidency: "same_barangay",
    eligGovernment: "no",
    eligOffense: "no",
    eligProperty: "not_applicable",
    ...patch,
  };
}

describe("evaluateIntakeEligibility", () => {
  it("stays incomplete until the required questions are answered", () => {
    expect(evaluateIntakeEligibility(EMPTY_ELIGIBILITY)).toBe("incomplete");
    expect(evaluateIntakeEligibility(form({ eligOffense: "" }))).toBe(
      "incomplete",
    );
    expect(
      evaluateIntakeEligibility(form({ eligResidency: "different_city" })),
    ).toBe("incomplete");
    expect(evaluateIntakeEligibility(form({ eligProperty: "yes" }))).toBe(
      "incomplete",
    );
  });

  it("marks clear same-barangay filings eligible", () => {
    expect(evaluateIntakeEligibility(form({}))).toBe("eligible");
    expect(evaluateIntakeEligibility(form({ eligResidency: "same_city" }))).toBe(
      "eligible",
    );
  });

  it("blocks parties outside the city unless their barangays adjoin", () => {
    expect(
      evaluateIntakeEligibility(
        form({ eligResidency: "different_city", eligAdjoining: "no" }),
      ),
    ).toBe("outside_kp");
    expect(
      evaluateIntakeEligibility(
        form({ eligResidency: "different_city", eligAdjoining: "yes" }),
      ),
    ).toBe("needs_review");
    expect(
      evaluateIntakeEligibility(
        form({ eligResidency: "different_city", eligAdjoining: "unsure" }),
      ),
    ).toBe("needs_review");
  });

  it("blocks government parties and excluded offenses", () => {
    expect(evaluateIntakeEligibility(form({ eligGovernment: "yes" }))).toBe(
      "outside_kp",
    );
    expect(evaluateIntakeEligibility(form({ eligOffense: "yes" }))).toBe(
      "outside_kp",
    );
  });

  it("blocks property in another city unless the parties agreed", () => {
    expect(
      evaluateIntakeEligibility(
        form({ eligProperty: "yes", eligPropertyAgreement: "no" }),
      ),
    ).toBe("outside_kp");
    expect(
      evaluateIntakeEligibility(
        form({ eligProperty: "yes", eligPropertyAgreement: "yes" }),
      ),
    ).toBe("needs_review");
    expect(
      evaluateIntakeEligibility(
        form({ eligProperty: "yes", eligPropertyAgreement: "unsure" }),
      ),
    ).toBe("needs_review");
  });

  it("sends unsure answers to staff review", () => {
    for (const patch of [
      { eligResidency: "unsure" },
      { eligGovernment: "unsure" },
      { eligOffense: "unsure" },
      { eligProperty: "unsure" },
    ] satisfies Partial<EligibilityFormState>[]) {
      expect(evaluateIntakeEligibility(form(patch))).toBe("needs_review");
    }
  });
});
