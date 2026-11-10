export type EligibilityFormState = {
  eligResidency:
    | ""
    | "same_barangay"
    | "same_city"
    | "different_city"
    | "unsure";
  eligAdjoining: "" | "yes" | "no" | "unsure";
  eligGovernment: "" | "yes" | "no" | "unsure";
  eligNaturalPersons: "" | "yes" | "no" | "unsure";
  eligPrivateParty: "" | "yes" | "no" | "unsure";
  eligOffense: "" | "yes" | "no" | "unsure";
  eligProperty: "" | "yes" | "no" | "not_applicable" | "unsure";
  eligPropertyAgreement: "" | "yes" | "no" | "unsure";
};

export const EMPTY_ELIGIBILITY: EligibilityFormState = {
  eligResidency: "",
  eligAdjoining: "",
  eligGovernment: "",
  eligNaturalPersons: "",
  eligPrivateParty: "",
  eligOffense: "",
  eligProperty: "",
  eligPropertyAgreement: "",
};

export type IntakeScreeningStatus =
  | "incomplete"
  | "eligible"
  | "needs_review"
  | "outside_kp";

// Mirrors the server check in complaint.eligibility.ts. The server remains
// authoritative; this only drives the live feedback and submit button.
export function evaluateIntakeEligibility(
  form: EligibilityFormState,
): IntakeScreeningStatus {
  if (
    !form.eligResidency ||
    !form.eligGovernment ||
    !form.eligNaturalPersons ||
    !form.eligPrivateParty ||
    !form.eligOffense ||
    !form.eligProperty
  ) {
    return "incomplete";
  }

  if (form.eligResidency === "different_city" && !form.eligAdjoining) {
    return "incomplete";
  }

  if (form.eligProperty === "yes" && !form.eligPropertyAgreement) {
    return "incomplete";
  }

  if (form.eligResidency === "different_city") {
    return form.eligAdjoining === "no" ? "outside_kp" : "needs_review";
  }

  if (form.eligGovernment === "yes") return "outside_kp";
  if (form.eligNaturalPersons === "no") return "outside_kp";
  if (form.eligPrivateParty === "no") return "outside_kp";
  if (form.eligOffense === "yes") return "outside_kp";

  if (form.eligProperty === "yes") {
    return form.eligPropertyAgreement === "no"
      ? "outside_kp"
      : "needs_review";
  }

  if (
    form.eligResidency === "unsure" ||
    form.eligGovernment === "unsure" ||
    form.eligNaturalPersons === "unsure" ||
    form.eligPrivateParty === "unsure" ||
    form.eligOffense === "unsure" ||
    form.eligProperty === "unsure"
  ) {
    return "needs_review";
  }

  return "eligible";
}
