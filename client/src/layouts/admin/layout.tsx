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
  useSidebar,
} from "@/components/ui/sidebar";
import { useT, type Key } from "@/lib/I18n";
import { CASE_VIEW_ROLES, HEARING_ROLES, NOTICE_ROLES, ADMIN_ROLES, type Role } from "@/lib/roles";
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
  { to: "/admin/complaints", label: "adminComplaints", icon: ClipboardList, roles: CASE_VIEW_ROLES },
  { to: "/admin/hearings", label: "adminHearings", icon: CalendarDays, roles: HEARING_ROLES },
  { to: "/admin/notices", label: "adminNotices", icon: Bell, roles: NOTICE_ROLES },
];

const adminLinks: NavLink[] = [
  { to: "/admin/accounts", label: "adminAccounts", icon: UserCog, roles: ADMIN_ROLES },
  { to: "/admin/audit", label: "adminAudit", icon: ScrollText, roles: ADMIN_ROLES },
      { to: "/admin/settings", label: "adminSettings", icon: Settings },
];

// Hovering a sidebar link starts the same chunk fetch React.lazy would trigger
// on navigation, so the page opens without the skeleton.
const routeImports: Record<string, () => Promise<unknown>> = {
  "/admin/analytics": () => import("@/features/admin/analytics/report"),
  "/admin/complaints": () => import("@/features/admin/complaint/list/table"),
  "/admin/hearings": () => import("@/features/admin/hearing/hearings"),
  "/admin/notices": () => import("@/features/admin/notice/list/table"),
  "/admin/accounts": () => import("@/features/admin/user/list/table"),
  "/admin/audit": () => import("@/features/admin/audit/list/table"),
  "/admin/settings": () => import("@/features/admin/setting/setting"),
};
const prefetchedRoutes = new Set<string>();

function prefetchRoute(to: string) {
  const load = routeImports[to];
  if (!load || prefetchedRoutes.has(to)) return;
  prefetchedRoutes.add(to);
  void load().catch(() => prefetchedRoutes.delete(to));
}

// The seal only has room in the collapsed icon rail; mounting it while the
// sidebar is expanded would download the logo for a hidden element.
function CollapsedSeal({ logoUrl }: { logoUrl?: string }) {
  const { isMobile, state } = useSidebar();
  if (isMobile || state !== "collapsed") return null;

  return (
    <Link
      to="/admin"
      className="flex size-8 items-center justify-center rounded-md"
    >
      <img
        src={logoUrl || "/seal-96.webp"}
        alt="Barangay seal"
        className="size-8 rounded-full object-contain"
        decoding="async"
      />
    </Link>
  );
}

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
            <Link
              to={to}
              onMouseEnter={() => prefetchRoute(to)}
              onFocus={() => prefetchRoute(to)}
            >
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

  const currentCrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <TopLoader />
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <CollapsedSeal logoUrl={settings?.logoUrl} />
          <Link to="/admin" className="text-lg font-semibold leading-tight group-data-[collapsible=icon]:hidden">
            {settings?.barangayName || "Barangay Kabayanihan"}
          </Link>
          <p className="text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
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
        <header className="sticky top-0 z-30 flex h-15 items-center justify-between border-b bg-background px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger />
            
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 overflow-hidden text-sm text-muted-foreground sm:flex">
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
            {currentCrumb && (
              <span className="truncate text-sm font-medium text-foreground sm:hidden">
                {currentCrumb.label}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-4">
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
        
        <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}