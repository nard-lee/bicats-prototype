import ComplaintsList from "@/features/admin/complaint/list/table";
import { ComplaintsLoader } from "@/features/admin/complaint/list/loader";
import ComplaintView from "@/features/admin/complaint/view/complaint";
import { ComplaintDetailLoader } from "@/features/admin/complaint/view/loader";
import ComplaintDocument from "@/features/admin/complaint/documents/document";
import { ComplaintDocumentLoader } from "@/features/admin/complaint/documents/loader";
import HearingsPage from "@/features/admin/hearing/hearings";
import { HearingsLoader } from "@/features/admin/hearing/loader";
import CreateUser from "@/features/admin/user/create";
import { createUserAction } from "@/features/admin/user/create-action";
import StaffAccounts from "@/features/admin/user/list/table";
import { UsersLoader } from "@/features/admin/user/list/loader";
import { usersAction } from "@/features/admin/user/list/action";
import Profile from "@/features/admin/user/profile";
import { ProfileLoader } from "@/features/admin/user/profile-loader";
import { profileAction } from "@/features/admin/user/profile-action";
import AuditLog from "@/features/admin/audit/list/table";
import { AuditLoader } from "@/features/admin/audit/list/loader";
import BarangaySettingsPage from "@/features/admin/setting/setting";
import { SettingsLoader } from "@/features/admin/setting/loader";
import { settingsAction } from "@/features/admin/setting/action";
import { loginAction } from "@/features/auth/login/action";
import Login from "@/features/auth/login/form";
import { fileComplaintAction } from "@/features/complaint/file/action";
import FileComplaint from "@/features/complaint/file/form";
import Track from "@/features/complaint/track/form";
import { trackAction } from "@/features/complaint/track/action";
import Home from "@/features/guest/welcome";
import NotFound from "@/features/errors/not-found";
import AdminLayout from "@/layouts/admin/layout";
import { AdminLoader, AdminOnlyLoader } from "@/layouts/admin/loader";
import AdminError from "@/layouts/admin/error";
import RootError from "@/layouts/root/error";
import RootLayout from "@/layouts/root/layout";
import { RootLoader } from "@/layouts/root/loader";
import { createBrowserRouter } from "react-router";
import NoticesList from "@/features/admin/notice/list/table";
import { NoticesLoader } from "@/features/admin/notice/list/loader";
import CreateNotice from "@/features/admin/notice/create/form";
import { createNoticeAction } from "@/features/admin/notice/create/action";
import { noticesAction } from "@/features/admin/notice/list/action";
import AdminReport from "@/features/admin/analytics/report";
import AdminOverview from "@/features/admin/overview/overview";
import { OverviewLoader } from "@/features/admin/overview/loader";
import { HomeLoader } from "@/features/guest/loader";
import { api } from "@/lib/api";

const router = createBrowserRouter([
  {
    id: "root",
    path: "/",
    element: <RootLayout />,
    loader: RootLoader,
    shouldRevalidate: () => true,
    errorElement: <RootError />,
    children: [
      { index: true, element: <Home />, loader: HomeLoader },
      { path: 'login', element: <Login />, action: loginAction },
      { path: 'file-complaint', element: <FileComplaint />, action: fileComplaintAction },
      { path: 'track-complaint', element: <Track />, action: trackAction },
      { path: '*', element: <NotFound /> }
    ]
  },
  // admin
  {
    id: "admin",
    path: '/admin',
    Component: AdminLayout,
    loader: AdminLoader,
    errorElement: <AdminError />,
    handle: { crumb: () => "Admin" },
    children: [
      {
        index: true,
        element: <AdminOverview />,
        loader: OverviewLoader,
        handle: { crumb: () => "Overview" }
      },
      {
        path: 'analytics',
        element: <AdminReport />,
        loader: () => api.get("/analytics/report").json(),
        handle: { crumb: () => "Analytics" }
      },
      {
        path: 'create',
        element: <CreateUser />,
        loader: AdminOnlyLoader,
        action: createUserAction,
        handle: { crumb: () => "Create Account" }
      },
      {
        path: 'accounts',
        element: <StaffAccounts />,
        loader: UsersLoader,
        action: usersAction,
        handle: { crumb: () => "Staff Accounts" }
      },
      {
        path: 'profile',
        element: <Profile />,
        loader: ProfileLoader,
        action: profileAction,
        handle: { crumb: () => "My Profile" }
      },
      {
        path: 'audit',
        element: <AuditLog />,
        loader: AuditLoader,
        handle: { crumb: () => "Audit Logs" }
      },
      {
        path: 'settings',
        element: <BarangaySettingsPage />,
        loader: SettingsLoader,
        action: settingsAction,
        handle: { crumb: () => "Settings" }
      },
      {
        path: 'complaints',
        element: <ComplaintsList />,
        loader: ComplaintsLoader,
        handle: { crumb: () => "Complaints" }
      },
      {
        path: 'hearings',
        element: <HearingsPage />,
        loader: HearingsLoader,
        handle: { crumb: () => "Mediation" }
      },
      {
        path: 'complaints/:id',
        element: <ComplaintView />,
        loader: ComplaintDetailLoader,
        handle: { crumb: (data: any) => data?.reference ? `Ref: ${data.reference}` : "View Complaint" }
      },
      {
        path: 'notices',
        element: <NoticesList />,
        loader: NoticesLoader,
        action: noticesAction,
        handle: { crumb: () => "Notices" }
      },
      {
        path: 'notices/create',
        element: <CreateNotice />,
        action: createNoticeAction,
        handle: { crumb: (data: any) => data?.reference ? `Ref: ${data.reference}` : "Create Notice" }
      },
      { path: '*', element: <NotFound /> },
    ]
  },
  // printable KP documents render on their own (no app chrome)
  {
    path: '/admin/complaints/:id/documents/:doc',
    element: <ComplaintDocument />,
    loader: ComplaintDocumentLoader,
    errorElement: <AdminError />,
  },
]);

export default router;
