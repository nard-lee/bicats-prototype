import { Link, NavLink, Outlet, useRouteLoaderData } from "react-router";
import { Button } from "@/components/ui/button";
import TopLoader from "@/components/top-loader";
import LanguageToggle from "@/components/language-toggle";
import ModeToggle from "@/components/mode-toggle";
import { useT, type Key } from "@/lib/I18n";
import type { getCurrentUser } from "@/hooks/use-auth";

const links: { to: string; label: Key; end?: boolean }[] = [
  { to: "/", label: "navHome", end: true },
  { to: "/file-complaint", label: "navFile" },
  { to: "/track-complaint", label: "navTrack" },
];

type User = Awaited<ReturnType<typeof getCurrentUser>>;

export default function RootLayout() {
  const { t } = useT();
  const user = useRouteLoaderData("root") as User;

  return (
    <div className="flex min-h-screen flex-col">
      <TopLoader />
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <div className="flex size-24 items-center justify-center rounded-full border font-semibold">
            <img className="h-full w-full" src="/seal.png" alt="Barangay seal" />
          </div>
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">{t("republic")}</p>
            <p className="text-xs text-muted-foreground">{t("city")}</p>
            <Link to="/" className="text-lg font-semibold">
              Barangay Kabayanihan
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Button asChild variant="ghost">
              {user ? (
                <Link to="/admin">{t("navStaff")}</Link>
              ) : (
                <Link to="/login">{t("login")}</Link>
              )}
            </Button>
            <ModeToggle />
            <LanguageToggle />
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `border-b-2 px-4 py-3 text-sm font-medium ${isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {t(l.label)}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-3">
          <div>
            <p className="font-semibold">Barangay Kabayanihan</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Barangay Hall, Purok 3, M. L. Quezon St., Santa Rosa, Laguna
            </p>
          </div>
          <div>
            <p className="font-semibold">{t("contact")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Hotline (049) 502-1188
              <br />
              Tanod 0917 845 2210
              <br />
              sanisidro.complaints@santarosa.gov.ph
            </p>
          </div>
          <div>
            <p className="font-semibold">{t("officeHours")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("monFri")}
              <br />
              {t("luponHearings")}
            </p>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Barangay Kabayanihan. {t("tagline")}
        </div>
      </footer>
    </div>
  );
}