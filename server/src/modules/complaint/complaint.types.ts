import type {
    EligibilityAnswers,
    EligibilityStatus,
} from "./complaint.eligibility.js";
import type { ServiceResult } from "./complaint.service-record.js";
import type {
    ArbitrationMode,
    COMPLAINT_STATUSES,
    COMPLAINT_TYPES,
} from "./complaint.schema.js";
import type { HearingKind } from "../hearing/hearing.types.js";

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];
export type { ArbitrationMode };

// RA 7160 §413: who hears an arbitration, and the date on the parties' written
// agreement to be arbitrated. Both are recorded once, at the move into the
// stage, and never changed afterwards.
export type ArbitrationChoice = {
    by: ArbitrationMode;
    agreementAt: Date;
};

// Snapshot of a lupon member on one case. Names are frozen at assignment so a
// later roster rename or removal never rewrites the case record.
export type PangkatMember = {
    id: number;
    fullName: string;
    isChairman: boolean;
};

// The panel as staff submit it: which three members, and which of them chairs.
export type PangkatChoice = {
    memberIds: number[];
    chairmanId: number;
};

export type ComplaintTrackUpdate = {
    status: string;
    publicNote: string | null;
    hearingAt: string | null;
    hearingKind: HearingKind | null;
    createdAt: string;
};

export type ComplaintTrackResult = {
    reference: string;
    status: string;
    updates: ComplaintTrackUpdate[];
};

export type Paginated<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type ComplaintListRow = {
    id: number;
    reference: string;
    complainantName: string;
    respondentName: string;
    complaintType: string;
    complaintTypeOther: string | null;
    status: string;
    createdAt: Date;
    viewedAt: Date | null;
    dueAt: Date | null;
};

// Katarungang Pambarangay flow: for each status, how many days the barangay
// has to take the next step (see the KP rules cited in the barangay handbook).
export type DeadlineDays = Partial<Record<ComplaintStatus, number>>;

export type ComplaintRisk = "overdue" | "due_soon" | "on_track" | "none";

export type ComplaintListFilters = {
    q?: string | undefined;
    status?: string | undefined;
    type?: string | undefined;
    open?: boolean | undefined;
    overdue?: boolean | undefined;
    dueSoon?: boolean | undefined;
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
    status: string;
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
    serviceRecords: Array<{
        id: number;
        servedAt: string;
        serverName: string;
        result: ServiceResult;
        notes: string | null;
        createdBy: string | null;
        createdAt: string;
    }>;
    history: Array<{
        kind: "status" | "service";
        status: string;
        date: string;
        note?: string;
        // Kept apart so a printable record can label the staff-only note; the
        // public tracker still only ever reads publicNote.
        publicNote?: string;
        internalNote?: string;
        by: string;
        hearingAt?: string;
        // The type of the session booked on that date, so a dated status entry
        // is labelled from its own session row instead of the stage it was
        // recorded in. Null when the session was later moved off that date.
        hearingKind?: HearingKind | null;
        serviceResult?: ServiceResult;
        serverName?: string;
    }>;
    hearings: Array<{
        id: number;
        scheduledAt: string;
        kind: string;
        status: string;
        location: string | null;
        outcome: string | null;
        complainantAttendance: string | null;
        respondentAttendance: string | null;
        attendanceNotes: string | null;
    }>;
    complainantAge: number;
    complainantPurok: string;
    complainantContact: string;
    complainantEmail: string | null;
    complainantAddress: string;
    respondentAddress: string | null;
    relationship: string | null;
    incidentAt: string;
    incidentPlace: string;
};
