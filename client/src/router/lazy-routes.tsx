import { lazy, Suspense, type ComponentType } from "react";

export const AdminOverview = lazy(() => import("@/features/admin/overview/overview"));
export const AdminReport = lazy(() => import("@/features/admin/analytics/report"));
export const ComplaintsList = lazy(() => import("@/features/admin/complaint/list/table"));
export const ComplaintView = lazy(() => import("@/features/admin/complaint/view/complaint"));
export const ComplaintDocument = lazy(() => import("@/features/admin/complaint/documents/document"));
export const HearingsPage = lazy(() => import("@/features/admin/hearing/hearings"));
export const CreateUser = lazy(() => import("@/features/admin/user/create"));
export const StaffAccounts = lazy(() => import("@/features/admin/user/list/table"));
export const Profile = lazy(() => import("@/features/admin/user/profile"));
export const AuditLog = lazy(() => import("@/features/admin/audit/list/table"));
export const BarangaySettingsPage = lazy(() => import("@/features/admin/setting/setting"));
export const NoticesList = lazy(() => import("@/features/admin/notice/list/table"));
export const CreateNotice = lazy(() => import("@/features/admin/notice/create/form"));

export function LazyRoute({ Component }: { Component: ComponentType }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <Component />
    </Suspense>
  );
}
