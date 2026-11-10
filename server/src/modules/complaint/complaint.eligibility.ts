import { z } from "zod";

export const ELIGIBILITY_STATUSES = [
  "unreviewed",
  "eligible",
  "needs_review",
  "outside_kp",
  "rejected",
] as const;

export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];
export type ScreenedEligibilityStatus = Exclude<EligibilityStatus, "unreviewed">;

const yesNoUnsure = z.enum(["yes", "no", "unsure"], {
  error: "Select an option",
});

// Flat fields so multipart form errors map straight back to the intake form.
export const intakeEligibilitySchema = z.object({
  eligResidency: z.enum(
    ["same_barangay", "same_city", "different_city", "unsure"],
    { error: "Select where the respondent lives" },
  ),
  eligAdjoining: z.enum(["yes", "no", "unsure"]).optional(),
  eligGovernment: yesNoUnsure,
  eligNaturalPersons: yesNoUnsure,
  eligPrivateParty: yesNoUnsure,
  eligOffense: yesNoUnsure,
  eligProperty: z.enum(["yes", "no", "not_applicable", "unsure"], {
    error: "Select an option",
  }),
  eligPropertyAgreement: z.enum(["yes", "no", "unsure"]).optional(),
});

export type IntakeEligibilityInput = z.output<typeof intakeEligibilitySchema>;

export type EligibilityAnswers = {
  respondentResidency: "same_barangay" | "same_city" | "different_city" | "unsure";
  adjoiningAgreement: "yes" | "no" | "unsure" | null;
  againstGovernment: "yes" | "no" | "unsure";
  // Optional because cases screened before these two questions existed carry
  // neither key, and the answers come straight out of a Json column that
  // nothing validates on read. An absent answer is "not asked", never an
  // exclusion.
  naturalPersonsOnly?: "yes" | "no" | "unsure";
  privateOffendedParty?: "yes" | "no" | "unsure";
  seriousOffenseOrVawc: "yes" | "no" | "unsure";
  propertyOutsideCity: "yes" | "no" | "not_applicable" | "unsure";
  propertyAgreement: "yes" | "no" | "unsure" | null;
};

export type EligibilityReason =
  | "different_city"
  | "different_city_unverified"
  | "adjoining_barangays"
  | "government_party"
  | "not_natural_persons"
  | "no_private_offended_party"
  | "excluded_offense"
  | "property_elsewhere"
  | "property_elsewhere_unverified"
  | "property_elsewhere_agreed"
  | "uncertain_answers";

export type EligibilityEvaluation = {
  status: ScreenedEligibilityStatus;
  reason: EligibilityReason | null;
};

export function toEligibilityAnswers(
  input: IntakeEligibilityInput,
): EligibilityAnswers {
  return {
    respondentResidency: input.eligResidency,
    adjoiningAgreement:
      input.eligResidency === "different_city"
        ? input.eligAdjoining ?? null
        : null,
    againstGovernment: input.eligGovernment,
    naturalPersonsOnly: input.eligNaturalPersons,
    privateOffendedParty: input.eligPrivateParty,
    seriousOffenseOrVawc: input.eligOffense,
    propertyOutsideCity: input.eligProperty,
    propertyAgreement:
      input.eligProperty === "yes"
        ? input.eligPropertyAgreement ?? null
        : null,
  };
}

// RA 7160 Sec. 408: the lupon covers parties in the same city/municipality,
// except for the exclusions screened here. Uncertain answers go to staff.
export function evaluateEligibility(
  answers: EligibilityAnswers,
): EligibilityEvaluation {
  if (answers.respondentResidency === "different_city") {
    if (answers.adjoiningAgreement === "yes") {
      return { status: "needs_review", reason: "adjoining_barangays" };
    }
    if (answers.adjoiningAgreement === "no") {
      return { status: "outside_kp", reason: "different_city" };
    }
    return { status: "needs_review", reason: "different_city_unverified" };
  }

  if (answers.againstGovernment === "yes") {
    return { status: "outside_kp", reason: "government_party" };
  }

  // The Lupon settles disputes between people; a claim against a company,
  // business or organization is heard by the court or the agency that
  // regulates it.
  if (answers.naturalPersonsOnly === "no") {
    return { status: "outside_kp", reason: "not_natural_persons" };
  }

  // An offense with no private offended party — a curfew or ordinance
  // violation, say — has no one for the barangay to bring together.
  if (answers.privateOffendedParty === "no") {
    return { status: "outside_kp", reason: "no_private_offended_party" };
  }

  if (answers.seriousOffenseOrVawc === "yes") {
    return { status: "outside_kp", reason: "excluded_offense" };
  }

  if (answers.propertyOutsideCity === "yes") {
    if (answers.propertyAgreement === "yes") {
      return { status: "needs_review", reason: "property_elsewhere_agreed" };
    }
    if (answers.propertyAgreement === "no") {
      return { status: "outside_kp", reason: "property_elsewhere" };
    }
    return { status: "needs_review", reason: "property_elsewhere_unverified" };
  }

  if (
    answers.respondentResidency === "unsure" ||
    answers.againstGovernment === "unsure" ||
    answers.naturalPersonsOnly === "unsure" ||
    answers.privateOffendedParty === "unsure" ||
    answers.seriousOffenseOrVawc === "unsure" ||
    answers.propertyOutsideCity === "unsure"
  ) {
    return { status: "needs_review", reason: "uncertain_answers" };
  }

  return { status: "eligible", reason: null };
}

// Which question the intake error lands on. Exhaustive on purpose: a reason
// added here without a case must fail the build rather than silently flag the
// residency question.
export function eligibilityIssueField(
  reason: EligibilityReason,
): keyof IntakeEligibilityInput {
  switch (reason) {
    case "government_party":
      return "eligGovernment";
    case "not_natural_persons":
      return "eligNaturalPersons";
    case "no_private_offended_party":
      return "eligPrivateParty";
    case "excluded_offense":
      return "eligOffense";
    case "different_city":
    case "different_city_unverified":
    case "adjoining_barangays":
      return "eligAdjoining";
    case "property_elsewhere":
    case "property_elsewhere_unverified":
    case "property_elsewhere_agreed":
      return "eligPropertyAgreement";
    case "uncertain_answers":
      return "eligResidency";
  }
}

export const updateEligibilitySchema = z
  .object({
    eligibilityStatus: z.enum(
      ["eligible", "needs_review", "outside_kp", "rejected"],
      {
        error: "Select an eligibility status",
      },
    ),
    eligibilityNotes: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional()
      .transform((value) => value || null),
    eligibilityReason: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional()
      .transform((value) => value || null),
  })
  .superRefine((value, ctx) => {
    if (value.eligibilityStatus === "rejected" && !value.eligibilityReason) {
      ctx.addIssue({
        code: "custom",
        path: ["eligibilityReason"],
        message: "Enter a reason for rejecting the complaint",
      });
    }
  });

export type UpdateEligibilityInput = z.output<typeof updateEligibilitySchema>;
