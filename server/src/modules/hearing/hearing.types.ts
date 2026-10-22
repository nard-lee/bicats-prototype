import type {
  ATTENDANCE_STATUSES,
  HEARING_KINDS,
  HEARING_STATUSES,
} from "./hearing.schema.js";

export type HearingKind = (typeof HEARING_KINDS)[number];
export type HearingStatus = (typeof HEARING_STATUSES)[number];
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type HearingListFilters = {
  from?: Date | undefined;
  to?: Date | undefined;
  status?: string | undefined;
  complaintId?: number | undefined;
};

export type HearingRow = {
  id: number;
  complaintId: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  complaintStatus: string;
  status: HearingStatus;
  scheduledAt: string;
  kind: HearingKind;
  overdue: boolean;
  started: boolean;
  location: string | null;
  notes: string | null;
  outcome: string | null;
  complainantAttendance: AttendanceStatus | null;
  respondentAttendance: AttendanceStatus | null;
  attendanceNotes: string | null;
  attendanceRecordedAt: string | null;
};

export type HearingComplaintOption = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  status: string;
};

export type HearingRecord = {
  id: number;
  complaintId: number;
  scheduledAt: Date;
  kind: string;
  status: string;
  location: string | null;
  notes: string | null;
  outcome: string | null;
  complainantAttendance: string | null;
  respondentAttendance: string | null;
  attendanceNotes: string | null;
  attendanceRecordedAt: Date | null;
  complaint: {
    reference: string;
    complainantName: string;
    respondentName: string;
    status: string;
  };
};
