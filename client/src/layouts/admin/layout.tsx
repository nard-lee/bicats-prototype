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
  ChartColumn,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  UserCog,
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
import { useT, type Key, type Lang } from "@/lib/I18n";
import TopLoader from "@/components/top-loader";
import { LogoutButton } from "./logout";
import type { AppRouteHandle } from "@/types/react-router";
import type { CurrentUser } from "@/hooks/use-auth";

type NavLink = {
  to: string;
  label: Key;
  icon: typeof Bell;
  end?: boolean;
};

const mainLinks: NavLink[] = [
  { to: "/admin", label: "adminOverview", icon: LayoutDashboard, end: true },
  { to: "/admin/analytics", label: "adminAnalytics", icon: ChartColumn },
  { to: "/admin/complaints", label: "adminComplaints", icon: ClipboardList },
  { to: "/admin/notices", label: "adminNotices", icon: Bell },
];

const adminLinks: NavLink[] = [
  { to: "/admin/accounts", label: "adminAccounts", icon: UserCog },
];

export default function AdminLayout() {
  const { t, lang, setLang } = useT();
  const { pathname } = useLocation();
  const user = useRouteLoaderData("admin") as CurrentUser | null;

  const isAdmin = user?.role === "admin";

  // Type the matches to include our custom Handle and unknown Data
  const matches = useMatches() as UIMatch<unknown, AppRouteHandle>[];

  const renderLinks = (items: NavLink[]) =>
    items.map(({ to, label, icon: Icon, end }) => (
      <SidebarMenuItem key={to}>
        <SidebarMenuButton
          asChild
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
    <SidebarProvider>
      <TopLoader />
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <Link to="/admin" className="text-lg font-semibold leading-tight">
            Barangay Kabayanihan
          </Link>
          <p className="text-xs text-muted-foreground">{t("adminPanel")}</p>
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

        <SidebarFooter className="gap-3 p-4">
          {/* Language toggle */}
          <div className="flex overflow-hidden rounded-md border text-xs font-medium">
            {(["tl", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`flex-1 py-1.5 ${lang === l
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="text-sm">
            <p className="font-medium">
              {user ? user.fullName : ""}
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
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

      <SidebarInset className="h-screen flex flex-col">
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              <Link to="/admin" className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Home className="h-4 w-4" />
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}