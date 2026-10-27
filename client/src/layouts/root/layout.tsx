import { Link, NavLink, Outlet, useRouteLoaderData } from "react-router";
import { Button } from "@/components/ui/button";
import AdSense from "@/components/adsense";
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

const YEAR = new Date().getFullYear();

export default function RootLayout() {
  const { t } = useT();
  const { user, settings } = useRouteLoaderData("root") as RootLoaderData;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Public-only: the admin panel must not load AdSense. */}
      <AdSense />
      <TopLoader />
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border font-semibold sm:size-24">
            <img
              className="h-full w-full object-contain"
              src={settings?.logoUrl || "/seal-192.webp"}
              srcSet={
                settings?.logoUrl
                  ? undefined
                  : "/seal-96.webp 96w, /seal-192.webp 192w"
              }
              sizes="(min-width: 640px) 96px, 48px"
              alt="Barangay seal"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {t("republic")}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {settings?.city || t("city")}
            </p>
            <Link to="/" className="block truncate text-base font-semibold sm:text-lg">
              {settings?.barangayName || "Barangay Kabayanihan"}
            </Link>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-4">
            <Button asChild variant="ghost" className="min-w-0 shrink px-1 sm:px-4">
              {user ? (
                <Link to="/admin" aria-label={t("navStaff")}>
                  <span className="truncate">{t("navStaff")}</span>
                </Link>
              ) : (
                <Link to="/login" aria-label={t("login")}>
                  <span className="truncate">{t("login")}</span>
                </Link>
              )}
            </Button>
            <div className="flex shrink-0 items-center gap-1 sm:gap-4">
              <ModeToggle />
              <LanguageToggle />
            </div>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap sm:px-4 ${isActive
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
        <div className="border-t py-4 text-center text-sm text-muted-foreground">
          © {YEAR}{" "}
          {settings?.barangayName || "Barangay Kabayanihan"}. {t("tagline")}{" "}
          <Link
            to="/privacy"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("privacyTitle")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
