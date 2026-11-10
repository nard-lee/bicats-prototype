import { api } from "@/lib/api";
import type { LoaderFunctionArgs } from "react-router";
import type { HearingKind } from "@/lib/session-kind";
import type {
  AttendanceStatus,
  HearingStatus,
} from "@/features/admin/hearing/loader";

export type ComplaintStatus =
  | "received"
  | "summoned"
  | "mediation"
  | "conciliation"
  | "arbitration"
  | "settled"
  | "certified"
  | "dismissed";

export type EligibilityStatus =
  | "unreviewed"
  | "eligible"
  | "needs_review"
  | "outside_kp"
  | "rejected";

export type ServiceResult = "received" | "refused" | "not_found";

export type PangkatMember = {
  id: number;
  fullName: string;
  isChairman: boolean;
};

// RA 7160 §413: which arbiter hears an arbitration, chosen on the move into
// the stage and fixed from then on.
export type ArbitrationMode = "punong_barangay" | "pangkat";

export type ServiceRecord = {
  id: number;
  servedAt: string;
  serverName: string;
  result: ServiceResult;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type EligibilityAnswers = {
  respondentResidency: "same_barangay" | "same_city" | "different_city" | "unsure";
  adjoiningAgreement: "yes" | "no" | "unsure" | null;
  againstGovernment: "yes" | "no" | "unsure";
  // Optional: cases screened before these two questions existed carry neither.
  naturalPersonsOnly?: "yes" | "no" | "unsure";
  privateOffendedParty?: "yes" | "no" | "unsure";
  seriousOffenseOrVawc: "yes" | "no" | "unsure";
  propertyOutsideCity: "yes" | "no" | "not_applicable" | "unsure";
  propertyAgreement: "yes" | "no" | "unsure" | null;
};

export type ComplaintDetail = {
  id: number;
  reference: string;
  prevId: number | null;
  nextId: number | null;
  complainantName: string;
  respondentName: string;
  complaintType: string;
  complaintTypeOther: string | null;
  status: ComplaintStatus;
  createdAt: string;
  dueAt: string | null;
  nextHearingAt: string | null;
  nextHearingKind: HearingKind | null;
  description: string;
  eligibilityStatus: EligibilityStatus;
  eligibilityAnswers: EligibilityAnswers | null;
  eligibilityNotes: string | null;
  eligibilityReason: string | null;
  eligibilityReviewedAt: string | null;
  pangkatMembers: PangkatMember[];
  pangkatChairman: string | null;
  arbitrationBy: ArbitrationMode | null;
  arbitrationAgreementAt: string | null;
  evidence: Array<{
    originalName: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  serviceRecords: ServiceRecord[];
  hearings: Array<{
    id: number;
    scheduledAt: string;
    kind: HearingKind;
    status: HearingStatus;
    location: string | null;
    outcome: string | null;
    complainantAttendance: AttendanceStatus | null;
    respondentAttendance: AttendanceStatus | null;
    attendanceNotes: string | null;
  }>;
  history: Array<{
    kind: "status" | "service";
    status: ComplaintStatus | "service";
    date: string;
    note?: string;
    // Split so a printed record can mark the staff-only note; the public
    // tracker only ever reads publicNote.
    publicNote?: string;
    internalNote?: string;
    by: string;
    hearingAt?: string;
    hearingKind?: HearingKind | null;
    serviceResult?: ServiceResult;
    serverName?: string;
  }>;
  complainantAge: number;
  complainantPurok: string;
  complainantContact: string;
  complainantAddress: string;
  respondentAddress: string | null;
  relationship: string | null;
  incidentAt: string;
  incidentPlace: string;
};

export async function ComplaintDetailLoader({ params }: LoaderFunctionArgs) {
  const id = params.id;
  
  if (!id) {
    throw new Response("Not Found", { status: 404 });
  }

  const complaint = await api
    .get(`/complaints/${id}`)
    .json<ComplaintDetail>();

  // Opening the case clears its "New" flag on the list.
  await api.post(`/complaints/${id}/view`).catch(() => {});

  return complaint;
}