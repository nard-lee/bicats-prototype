import { useLoaderData, useRouteLoaderData } from "react-router";
import { ChevronDown } from "lucide-react";
import { complaintTypeKeys, useT, type Key } from "@/lib/I18n";
import type { RootLoaderData } from "@/layouts/root/loader";
import type { HomeData } from "./loader";

const stepKeys: { title: Key; text: Key }[] = [
  { title: "step1Title", text: "step1Text" },
  { title: "step2Title", text: "step2Text" },
  { title: "step3Title", text: "step3Text" },
  { title: "step4Title", text: "step4Text" },
];

const aboutKeys: { title: Key; text: Key }[] = [
  { title: "about1Title", text: "about1Text" },
  { title: "about2Title", text: "about2Text" },
  { title: "about3Title", text: "about3Text" },
];

const faqKeys: { q: Key; a: Key }[] = [
  { q: "faq1Q", a: "faq1A" },
  { q: "faq2Q", a: "faq2A" },
  { q: "faq3Q", a: "faq3A" },
  { q: "faq4Q", a: "faq4A" },
  { q: "faq5Q", a: "faq5A" },
  { q: "faq6Q", a: "faq6A" },
];

function telHref(value: string) {
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

export default function Home() {
  const { t, lang } = useT();
  const { items: notices, luponMembers } = useLoaderData() as HomeData;
  const { settings } = useRouteLoaderData("root") as RootLoaderData;

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
    });

  const address = [
    settings?.address,
    settings?.barangayName,
    settings?.city,
    settings?.province,
  ]
    .filter(Boolean)
    .join(", ");

  const hotline = [
    settings?.hotline,
    settings?.tanodNumber ? `Tanod ${settings.tanodNumber}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // Settings carry the whole council as "Name — Position". Until a roster is
  // published, the page names only the two officers who sign documents.
  const council: { name: string; title: string }[] = (
    settings?.officials ?? []
  ).map((entry) => {
    const at = entry.indexOf("—");
    return at === -1
      ? { name: entry.trim(), title: "" }
      : { name: entry.slice(0, at).trim(), title: entry.slice(at + 1).trim() };
  });

  const signatories: { name: string; title: string }[] = [
    {
      name: settings?.punongBarangay ?? "",
      title: settings?.punongTitle ?? "",
    },
    {
      name: settings?.secretaryName ?? "",
      title: settings?.secretaryTitle ?? "",
    },
  ].filter((o) => o.name);

  const officials = council.length > 0 ? council : signatories;

  // The footer already carries the hall's contact block, so the hero only states
  // what a complainant checks before they commit to filing.
  const details: { label: string; value: string }[] = [
    { label: t("hallAddress"), value: address },
    { label: t("officeHours"), value: settings?.officeHours || t("hallHours") },
  ].filter((d) => d.value);

  return (
    <div>
      {/* Watermark pinned to the viewport: the page scrolls, the seal stays.
          Everything below the hero sits on an opaque sheet, so the seal is a
          front-door-only decoration without needing any scroll JS. */}
      <img
        aria-hidden="true"
        alt=""
        className="pointer-events-none fixed -left-32 top-1/2 -z-10 size-[32rem] -translate-y-1/2 opacity-[0.06] sm:size-[40rem]"
        decoding="async"
        src="/seal-192.webp"
      />
      {/* Front door: the title on the left, the illustration and hotline on the right. */}
      <section>
        <div className="relative mx-auto grid max-w-6xl px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="py-14 lg:py-24">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.28em] text-primary dark:text-status-ink">
              {settings?.documentOfficeLine || t("eyebrow")}
            </p>
            <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.02] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              {t("heroText")}
            </p>
            <dl className="mt-10 max-w-xl">
              {details.map((d) => (
                <div
                  key={d.label}
                  className="grid gap-1 py-2.5 first:pt-0 sm:grid-cols-[8rem_1fr] sm:gap-6"
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {d.label}
                  </dt>
                  <dd className="text-sm leading-6">{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="mb-14 mt-2 lg:mb-24 lg:mt-24">
            <div className="relative">
              {/* The same cut, slid behind the image */}
              <span
                aria-hidden="true"
                className="absolute inset-0 translate-x-3 translate-y-3 bg-primary/15 [clip-path:polygon(0_18%,18%_0,100%_0,100%_82%,82%_100%,0_100%)] sm:translate-x-4 sm:translate-y-4"
              />
              <img
                alt=""
                aria-hidden="true"
                className="relative aspect-[4/3] w-full object-cover [clip-path:polygon(0_18%,18%_0,100%_0,100%_82%,82%_100%,0_100%)]"
                fetchPriority="high"
                height="750"
                src="/home-hero-1000.webp"
                srcSet="/home-hero-750.webp 750w, /home-hero-1000.webp 1000w"
                width="1000"
              />
            </div>
            {hotline && (
              <p className="mt-6 text-sm">
                {t("hallHotline")}{" "}
                <a
                  className="text-primary dark:text-status-ink font-semibold underline underline-offset-4 hover:decoration-2"
                  href={telHref(hotline)}
                >
                  {hotline}
                </a>
              </p>
            )}
          </aside>
        </div>
      </section>

      {/* Opaque sheet: as it slides over the pinned seal it buries it, so the
          watermark reads as front-door-only with no scroll animation. */}
      <div className="bg-background">
        {/* Process: numbered stops, nothing but space between them. */}
        <section className="bg-primary/5">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {t("howTitle")}
            </h2>
            <ol className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {stepKeys.map((s, i) => (
                <li key={s.title}>
                  <p
                    aria-hidden="true"
                    className="font-heading text-4xl font-extrabold leading-none tracking-tight text-primary dark:text-status-ink"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-4 text-base font-semibold">{t(s.title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t(s.text)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
  
        {/* Notice board on its own row. */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-2xl font-bold tracking-tight">
                {t("noticesTitle")}
              </h2>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {t("noticesLatest")}
              </p>
            </div>
            {notices.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {t("noticesEmpty")}
              </p>
            ) : (
              <ul className="mt-2">
                {notices.map((n) => (
                  <li
                    key={n.id}
                    className="grid gap-2 py-6 first:pt-4 sm:grid-cols-[8.5rem_1fr] sm:gap-8"
                  >
                    <time className="text-sm tabular-nums text-muted-foreground">
                      {date(n.createdAt)}
                    </time>
                    <div className="max-w-3xl">
                      <h3 className="text-base font-semibold">{n.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 whitespace-pre-line text-muted-foreground">
                        {n.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
  
        {/* What this desk takes up. */}
        <section className="bg-primary/5">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {t("typesTitle")}
            </h2>
            <ul className="mt-8 grid gap-x-12 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {complaintTypeKeys.map((k) => (
                <li key={k} className="py-2">
                  {t(k)}
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("typesNote")}
            </p>
          </div>
        </section>
  
        {/* About: three columns held apart by whitespace alone. */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {t("aboutTitle")}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              {t("aboutText")}
            </p>
            <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-3">
              {aboutKeys.map((item) => (
                <div key={item.title}>
                  <h3 className="font-heading text-sm font-semibold uppercase tracking-[0.18em]">
                    {t(item.title)}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {t(item.text)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
  
        {/* The people behind the desk: the council in office, and the members who hear. */}
        {(officials.length > 0 || luponMembers.length > 0) && (
          <section className="bg-primary/5">
            <div className="mx-auto max-w-6xl px-6 py-16">
              <h2 className="font-heading text-2xl font-bold tracking-tight">
                {t("settingsOfficials")}
              </h2>
  
              {officials.length > 0 && (
                <>
                  {council.length === 0 && (
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                      {t("officialsLead")}
                    </p>
                  )}
                  <ul className="mt-8 grid gap-x-12 text-sm sm:grid-cols-2">
                    {officials.map((o, i) => (
                      <li key={`${o.name}-${i}`} className="py-4">
                        <p className="font-heading text-base font-semibold tracking-tight">
                          {o.name}
                        </p>
                        {o.title && (
                          <p className="mt-0.5 text-muted-foreground">{o.title}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
  
              {luponMembers.length > 0 && (
                <div className="mt-12">
                  <h3 className="font-heading text-sm font-semibold uppercase tracking-[0.18em]">
                    {t("luponTitle")}
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                    {t("luponNote")}
                  </p>
                  <ul className="mt-6 grid gap-x-12 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {luponMembers.map((name, i) => (
                      <li key={`${name}-${i}`} className="py-2">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
  
        {/* FAQ in two columns so the questions read at a glance. */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {t("faqTitle")}
            </h2>
            <div className="mt-8 grid gap-x-12 md:grid-cols-2">
              {[0, 1].map((column) => (
                <div key={column}>
                  {faqKeys
                    .slice(
                      column * Math.ceil(faqKeys.length / 2),
                      (column + 1) * Math.ceil(faqKeys.length / 2),
                    )
                    .map((item) => (
                      <details
                        key={item.q}
                        className="group py-5 first:pt-0 last:pb-0"
                      >
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                          {t(item.q)}
                          <ChevronDown
                            aria-hidden="true"
                            className="size-4 shrink-0 translate-y-0.5 text-primary dark:text-status-ink transition-transform duration-200 group-open:rotate-180"
                          />
                        </summary>
                        <p className="mt-2.5 max-w-xl text-sm leading-6 text-muted-foreground">
                          {t(item.a)}
                        </p>
                      </details>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
