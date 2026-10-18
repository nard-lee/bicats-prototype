import { api } from "@/lib/api";

export type RecentComplaint = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  complaintType: string;
  status: string;
  createdAt: string;
};

export type UpcomingHearing = {
  id: number;
  hearingAt: string;
  status: string;
  complaint: {
    id: number;
    reference: string;
    complainantName: string;
  } | null;
};

export type AttentionItem = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  status: string;
  dueAt: string | null;
  risk: "overdue" | "due_soon" | "on_track" | "none";
};

export type Overview = {
  totals: {
    complaints: number;
    open: number;
    settled: number;
    overdue: number;
    atRisk: number;
    notices: number;
    publishedNotices: number;
  };
  statusCounts: Record<string, number>;
  recentComplaints: RecentComplaint[];
  upcomingHearings: UpcomingHearing[];
  attention: AttentionItem[];
};

export async function OverviewLoader() {
  return api.get("/analytics/overview").json<Overview>();
}
