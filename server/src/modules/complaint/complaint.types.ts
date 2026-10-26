import type {
    EligibilityAnswers,
    EligibilityStatus,
} from "./complaint.eligibility.js";
import type { ServiceResult } from "./complaint.service-record.js";
import type { COMPLAINT_PRIORITIES, COMPLAINT_STATUSES, COMPLAINT_TYPES } from "./complaint.schema.js";

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];

export type ComplaintTrackUpdate = {
    status: string;
    publicNote: string | null;
    hearingAt: string | null;
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
    priority: string;
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
    priority?: string | undefined;
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
    priority: string;
    createdAt: string;
    dueAt: string | null;
    nextHearingAt: string | null;
    nextHearingKind: string | null;
    description: string;
    eligibilityStatus: EligibilityStatus;
    eligibilityAnswers: EligibilityAnswers | null;
    eligibilityNotes: string | null;
    eligibilityReason: string | null;
    eligibilityReviewedAt: string | null;
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
        by: string;
        hearingAt?: string;
        serviceResult?: ServiceResult;
        serverName?: string;
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
