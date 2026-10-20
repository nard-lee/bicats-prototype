import {
  Link,
  Outlet,
  useLocation,
  useRouteLoaderData,
  useMatches,
  type UIMatch,
} from "react-router";
import {
  Bell,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserCog,
  UserRound,
  ChevronRight,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useT, type Key } from "@/lib/I18n";
import { HEARING_ROLES, NOTICE_ROLES, ADMIN_ROLES, type Role } from "@/lib/roles";
import TopLoader from "@/components/top-loader";
import LanguageToggle from "@/components/language-toggle";
import ModeToggle from "@/components/mode-toggle";
import NotificationsBell from "@/features/admin/notifications/bell";
import { LogoutButton } from "./logout";
import type { AppRouteHandle } from "@/types/react-router";
import type { AdminLoaderData } from "./loader";

type NavLink = {
  to: string;
  label: Key;
  icon: typeof Bell;
  end?: boolean;
  roles?: Role[];
};

const mainLinks: NavLink[] = [
  { to: "/admin", label: "adminOverview", icon: LayoutDashboard, end: true },
  { to: "/admin/analytics", label: "adminAnalytics", icon: ChartColumn },
  { to: "/admin/complaints", label: "adminComplaints", icon: ClipboardList },
  { to: "/admin/hearings", label: "adminHearings", icon: CalendarDays, roles: HEARING_ROLES },
  { to: "/admin/notices", label: "adminNotices", icon: Bell, roles: NOTICE_ROLES },
];

const adminLinks: NavLink[] = [
  { to: "/admin/accounts", label: "adminAccounts", icon: UserCog, roles: ADMIN_ROLES },
  { to: "/admin/audit", label: "adminAudit", icon: ScrollText, roles: ADMIN_ROLES },
      { to: "/admin/settings", label: "adminSettings", icon: Settings },
];

export default function AdminLayout() {
  const { t } = useT();
  const { pathname } = useLocation();
  const { user, settings } = useRouteLoaderData("admin") as AdminLoaderData;

  const role = (user?.role ?? "staff") as Role;
  const isAdmin = role === "admin";

  // Type the matches to include our custom Handle and unknown Data
  const matches = useMatches() as UIMatch<unknown, AppRouteHandle>[];

  const renderLinks = (items: NavLink[]) =>
    items
      .filter((item) => !item.roles || item.roles.includes(role))
      .map(({ to, label, icon: Icon, end }) => (
        <SidebarMenuItem key={to}>
          <SidebarMenuButton
            asChild
            tooltip={t(label)}
            isActive={end ? pathname === to : pathname.startsWith(to)}
          >
            <Link to={to}>
              <Icon />
              <span>{t(label)}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ));

  // Generate breadcrumbs
  const breadcrumbs = matches
    .map((match) => {
      const crumbFn = match.handle?.crumb;
      if (!crumbFn) return null;
      
      const label = crumbFn(match.loaderData);
      return { 
        label: label, 
        path: match.pathname 
      };
    })
    .filter((b): b is { label: string; path: string } => b !== null);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <TopLoader />
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <Link
            to="/admin"
            className="hidden size-8 items-center justify-center rounded-md group-data-[collapsible=icon]:flex"
          >
            <img
              src={settings?.logoUrl || "/seal.png"}
              alt="Barangay seal"
              className="size-8 rounded-full object-contain"
            />
          </Link>
          <Link to="/admin" className="text-lg font-semibold leading-tight group-data-[collapsible=icon]:hidden">
            {settings?.barangayName || "Barangay Kabayanihan"}
          </Link>
          <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {t("adminPanel")}
          </p>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>{renderLinks(mainLinks)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>{t("adminSection")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderLinks(adminLinks)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="gap-3 p-4 group-data-[collapsible=icon]:p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={t("myProfile")}
                isActive={pathname === "/admin/profile"}
              >
                <Link to="/admin/profile">
                  <UserRound />
                  <span>{t("myProfile")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t("viewSite")}>
                <Link to="/" reloadDocument>
                  <ExternalLink />
                  <span>{t("viewSite")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <LogoutButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger />
            
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 overflow-hidden text-sm text-muted-foreground">
              <Link to="/admin" className="flex shrink-0 items-center gap-1 hover:text-foreground transition-colors">
                <Home className="h-4 w-4" />
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex min-w-0 items-center gap-1">
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  {index === breadcrumbs.length - 1 ? (
                    <span className="truncate font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="truncate hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {user && (
              <Link
                to="/admin/profile"
                className="hidden text-sm font-medium hover:text-primary sm:inline"
              >
                {user.fullName}
              </Link>
            )}
            <NotificationsBell />
            <ModeToggle />
            <LanguageToggle />
          </div>
        </header>
        
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}