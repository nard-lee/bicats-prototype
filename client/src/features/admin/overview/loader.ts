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

export type Overview = {
  totals: {
    complaints: number;
    open: number;
    settled: number;
    notices: number;
    publishedNotices: number;
  };
  statusCounts: Record<string, number>;
  recentComplaints: RecentComplaint[];
  upcomingHearings: UpcomingHearing[];
};

export async function OverviewLoader() {
  return api.get("/analytics/overview").json<Overview>();
}
