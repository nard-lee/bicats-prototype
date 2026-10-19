import { api } from "@/lib/api";
import type { LoaderFunctionArgs } from "react-router";

export type HearingStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type HearingKind = "mediation" | "conciliation" | "hearing";

export type HearingItem = {
  id: number;
  complaintId: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  scheduledAt: string;
  kind: HearingKind;
  status: HearingStatus;
  location: string | null;
  notes: string | null;
  outcome: string | null;
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
  complaints: ComplaintOption[];
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

  const [hearings, complaints] = await Promise.all([
    api
      .get("/hearings", {
        searchParams: { from: from.toISOString(), to: to.toISOString() },
      })
      .json<{ items: HearingItem[] }>(),
    api.get("/hearings/complaints").json<{ items: ComplaintOption[] }>(),
  ]);

  return {
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
    hearings: hearings.items,
    complaints: complaints.items,
  } satisfies HearingsData;
}
