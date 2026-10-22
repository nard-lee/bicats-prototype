import { ComplaintsLoader } from "@/features/admin/complaint/list/loader";
import { ComplaintDetailLoader } from "@/features/admin/complaint/view/loader";
import { ComplaintDocumentLoader } from "@/features/admin/complaint/documents/loader";
import { HearingsLoader } from "@/features/admin/hearing/loader";
import { createUserAction } from "@/features/admin/user/create-action";
import { UsersLoader } from "@/features/admin/user/list/loader";
import { usersAction } from "@/features/admin/user/list/action";
import { ProfileLoader } from "@/features/admin/user/profile-loader";
import { profileAction } from "@/features/admin/user/profile-action";
import { AuditLoader } from "@/features/admin/audit/list/loader";
import { SettingsLoader } from "@/features/admin/setting/loader";
import { settingsAction } from "@/features/admin/setting/action";
import { loginAction } from "@/features/auth/login/action";
import { fileComplaintAction } from "@/features/complaint/file/action";
import { fileComplaintLoader } from "@/features/complaint/file/loader";
import { trackAction } from "@/features/complaint/track/action";
import NotFound from "@/features/errors/not-found";
import { AdminLoader, AdminOnlyLoader } from "@/layouts/admin/loader";
import AdminError from "@/layouts/admin/error";
import RootError from "@/layouts/root/error";
import RootLayout from "@/layouts/root/layout";
import { RootLoader } from "@/layouts/root/loader";
import { createBrowserRouter } from "react-router";
import { NoticesLoader } from "@/features/admin/notice/list/loader";
import { createNoticeAction } from "@/features/admin/notice/create/action";
import { noticesAction } from "@/features/admin/notice/list/action";
import { OverviewLoader } from "@/features/admin/overview/loader";
import { HomeLoader } from "@/features/guest/loader";
import { api } from "@/lib/api";
import {
  AdminShellSkeleton,
  CardsPageSkeleton,
  CenteredCardSkeleton,
  DetailPageSkeleton,
  DocumentSkeleton,
  FormPageSkeleton,
  LandingSkeleton,
} from "./route-skeletons";
import {
  AdminLayout,
  AdminOverview,
  AdminReport,
  AuditLog,
  BarangaySettingsPage,
  ComplaintDocument,
  ComplaintsList,
  ComplaintView,
  CreateNotice,
  CreateUser,
  FileComplaint,
  HearingsPage,
  Home,
  LazyRoute,
  Login,
  NoticesList,
  Profile,
  StaffAccounts,
  Track,
} from "./lazy-routes";

const router = createBrowserRouter([
  {
    id: "root",
    path: "/",
    element: <RootLayout />,
    loader: RootLoader,
    shouldRevalidate: () => true,
    errorElement: <RootError />,
    children: [
      { index: true, element: <LazyRoute Component={Home} fallback={<LandingSkeleton />} />, loader: HomeLoader },
      { path: 'login', element: <LazyRoute Component={Login} fallback={<CenteredCardSkeleton />} />, action: loginAction },
      {
        path: 'file-complaint',
        element: <LazyRoute Component={FileComplaint} fallback={<FormPageSkeleton />} />,
        loader: fileComplaintLoader,
        action: fileComplaintAction,
      },
      { path: 'track-complaint', element: <LazyRoute Component={Track} fallback={<CenteredCardSkeleton />} />, action: trackAction },
      { path: '*', element: <NotFound /> }
    ]
  },
  // admin
  {
    id: "admin",
    path: '/admin',
    element: <LazyRoute Component={AdminLayout} fallback={<AdminShellSkeleton />} />,
    loader: AdminLoader,
    errorElement: <AdminError />,
    handle: { crumb: () => "Admin" },
    children: [
      {
        index: true,
        element: <LazyRoute Component={AdminOverview} fallback={<CardsPageSkeleton />} />,
        loader: OverviewLoader,
        handle: { crumb: () => "Overview" }
      },
      {
        path: 'analytics',
        element: <LazyRoute Component={AdminReport} fallback={<CardsPageSkeleton />} />,
        loader: () => api.get("/analytics/report").json(),
        handle: { crumb: () => "Analytics" }
      },
      {
        path: 'create',
        element: <LazyRoute Component={CreateUser} fallback={<FormPageSkeleton />} />,
        loader: AdminOnlyLoader,
        action: createUserAction,
        handle: { crumb: () => "Create Account" }
      },
      {
        path: 'accounts',
        element: <LazyRoute Component={StaffAccounts} />,
        loader: UsersLoader,
        action: usersAction,
        handle: { crumb: () => "Staff Accounts" }
      },
      {
        path: 'profile',
        element: <LazyRoute Component={Profile} fallback={<FormPageSkeleton />} />,
        loader: ProfileLoader,
        action: profileAction,
        handle: { crumb: () => "My Profile" }
      },
      {
        path: 'audit',
        element: <LazyRoute Component={AuditLog} />,
        loader: AuditLoader,
        handle: { crumb: () => "Audit Logs" }
      },
      {
        path: 'settings',
        element: <LazyRoute Component={BarangaySettingsPage} fallback={<FormPageSkeleton />} />,
        loader: SettingsLoader,
        action: settingsAction,
        handle: { crumb: () => "Settings" }
      },
      {
        path: 'complaints',
        element: <LazyRoute Component={ComplaintsList} />,
        loader: ComplaintsLoader,
        handle: { crumb: () => "Complaints" }
      },
      {
        path: 'hearings',
        element: <LazyRoute Component={HearingsPage} />,
        loader: HearingsLoader,
        handle: { crumb: () => "Mediation" }
      },
      {
        path: 'complaints/:id',
        element: <LazyRoute Component={ComplaintView} fallback={<DetailPageSkeleton />} />,
        loader: ComplaintDetailLoader,
        handle: { crumb: (data: any) => data?.reference ? `Ref: ${data.reference}` : "View Complaint" }
      },
      {
        path: 'notices',
        element: <LazyRoute Component={NoticesList} />,
        loader: NoticesLoader,
        action: noticesAction,
        handle: { crumb: () => "Notices" }
      },
      {
        path: 'notices/create',
        element: <LazyRoute Component={CreateNotice} fallback={<FormPageSkeleton />} />,
        action: createNoticeAction,
        handle: { crumb: (data: any) => data?.reference ? `Ref: ${data.reference}` : "Create Notice" }
      },
      { path: '*', element: <NotFound /> },
    ]
  },
  // printable KP documents render on their own (no app chrome)
  {
    path: '/admin/complaints/:id/documents/:doc',
    element: <LazyRoute Component={ComplaintDocument} fallback={<DocumentSkeleton />} />,
    loader: ComplaintDocumentLoader,
    errorElement: <AdminError />,
  },
]);

export default router;
