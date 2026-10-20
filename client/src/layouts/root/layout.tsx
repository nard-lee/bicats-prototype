import { Link, NavLink, Outlet, useRouteLoaderData } from "react-router";
import { Button } from "@/components/ui/button";
import TopLoader from "@/components/top-loader";
import LanguageToggle from "@/components/language-toggle";
import ModeToggle from "@/components/mode-toggle";
import { useT, type Key } from "@/lib/I18n";
import type { RootLoaderData } from "./loader";

const links: { to: string; label: Key; end?: boolean }[] = [
  { to: "/", label: "navHome", end: true },
  { to: "/file-complaint", label: "navFile" },
  { to: "/track-complaint", label: "navTrack" },
];

export default function RootLayout() {
  const { t } = useT();
  const { user, settings } = useRouteLoaderData("root") as RootLoaderData;

  return (
    <div className="flex min-h-screen flex-col">
      <TopLoader />
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <div className="flex size-24 items-center justify-center rounded-full border font-semibold">
            <img
              className="h-full w-full object-contain"
              src={settings?.logoUrl || "/seal.png"}
              alt="Barangay seal"
            />
          </div>
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">{t("republic")}</p>
            <p className="text-xs text-muted-foreground">
              {settings?.city || t("city")}
            </p>
            <Link to="/" className="text-lg font-semibold">
              {settings?.barangayName || "Barangay Kabayanihan"}
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
            <p className="font-semibold">
              {settings?.barangayName || "Barangay Kabayanihan"}
            </p>
            <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
              {settings?.address || t("city")}
            </p>
          </div>
          <div>
            <p className="font-semibold">{t("contact")}</p>
            <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
              {[
                settings?.hotline,
                settings?.tanodNumber ? `Tanod ${settings.tanodNumber}` : "",
                settings?.email,
              ]
                .filter(Boolean)
                .join("\n") || "—"}
            </p>
          </div>
          <div>
            <p className="font-semibold">{t("officeHours")}</p>
            <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
              {settings?.officeHours || t("monFri")}
            </p>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}{" "}
          {settings?.barangayName || "Barangay Kabayanihan"}. {t("tagline")}
        </div>
      </footer>
    </div>
  );
}