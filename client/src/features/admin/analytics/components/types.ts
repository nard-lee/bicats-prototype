export type ReportData = {
  types: { complaintType: string; _count: { complaintType: number } }[];
  hotspots: { complainantPurok: string; _count: { complainantPurok: number } }[];
  trends: { month: string; count: number }[];
  statusDist: { status: string; _count: { status: number } }[];
};

export type DigestData = {
  from: string;
  to: string;
  filed: {
    total: number;
    byType: { complaintType: string; _count: { complaintType: number } }[];
    byPurok: { complainantPurok: string; _count: { complainantPurok: number } }[];
  };
  resolved: {
    total: number;
    settled: number;
    certified: number;
    dismissed: number;
    avgResolutionDays: number | null;
  };
  sessions: { held: number; noShow: number };
  snapshot: { open: number; overdue: number };
};

export type Kpi = { label: string; value: string; hint?: string };

export type TypeDatum = { name: string; value: number };

export type HotspotDatum = { name: string; cases: number };

export type TrendDatum = { date: Date; name: string; cases: number };

export type ScopeGroup = {
  label: string;
  options: { value: string; label: string }[];
};
