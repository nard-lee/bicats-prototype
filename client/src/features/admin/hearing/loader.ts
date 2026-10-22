import { api } from "@/lib/api";
import type { LoaderFunctionArgs } from "react-router";
import type { BarangaySettings } from "@/features/admin/setting/loader";

export type HearingStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type HearingKind = "mediation" | "conciliation" | "hearing";
export type AttendanceStatus = "present" | "absent" | "excused";

export type HearingItem = {
  id: number;
  complaintId: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  complaintStatus: string;
  scheduledAt: string;
  kind: HearingKind;
  status: HearingStatus;
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

export type ComplaintOption = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  status: string;
};

export type HearingsData = {
  month: string; // YYYY-MM
  hearings: HearingItem[];
  overdue: HearingItem[];
  upcoming: HearingItem[];
  week: HearingItem[];
  complaints: ComplaintOption[];
  settings: BarangaySettings;
};

function parseMonth(input: string | null): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(input ?? "");
  if (match && match[1] && match[2]) {
    return { year: Number(match[1]), month: Number(match[2]) - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export async function HearingsLoader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const { year, month } = parseMonth(params.get("month"));

  const from = new Date(year, month, 1, 0, 0, 0, 0);
  const to = new Date(year, month + 1, 1, 0, 0, 0, 0);

  const [hearings, scheduled, complaints, settings] = await Promise.all([
    api
      .get("/hearings", {
        searchParams: { from: from.toISOString(), to: to.toISOString() },
      })
      .json<{ items: HearingItem[] }>(),
    api
      .get("/hearings", { searchParams: { status: "scheduled" } })
      .json<{ items: HearingItem[] }>(),
    api.get("/hearings/complaints").json<{ items: ComplaintOption[] }>(),
    api.get("/settings").json<BarangaySettings>(),
  ]);

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const overdue = scheduled.items.filter((item) => item.overdue);
  const upcoming = scheduled.items.filter((item) => !item.overdue);
  const week = upcoming.filter((item) => new Date(item.scheduledAt) <= weekEnd);

  return {
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
    hearings: hearings.items,
    overdue,
    upcoming,
    week,
    complaints: complaints.items,
    settings,
  } satisfies HearingsData;
}
