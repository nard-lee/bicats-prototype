import { Link, useLoaderData, useRouteLoaderData } from "react-router";
import { Clock, FileText, MapPin, Phone, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { complaintTypeKeys, useT, type Key } from "@/lib/I18n";
import type { RootLoaderData } from "@/layouts/root/loader";
import type { PublicNoticesResponse } from "./loader";

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

const testimonyKeys: { quote: Key; name: Key; meta: Key }[] = [
  { quote: "testimony1Quote", name: "testimony1Name", meta: "testimony1Meta" },
  { quote: "testimony2Quote", name: "testimony2Name", meta: "testimony2Meta" },
  { quote: "testimony3Quote", name: "testimony3Name", meta: "testimony3Meta" },
];

const faqKeys: { q: Key; a: Key }[] = [
  { q: "faq1Q", a: "faq1A" },
  { q: "faq2Q", a: "faq2A" },
  { q: "faq3Q", a: "faq3A" },
  { q: "faq4Q", a: "faq4A" },
  { q: "faq5Q", a: "faq5A" },
  { q: "faq6Q", a: "faq6A" },
];

export default function Home() {
  const { t, lang } = useT();
  const { items: notices } = useLoaderData() as PublicNoticesResponse;
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

  const phones = [
    settings?.hotline,
    settings?.tanodNumber ? `Tanod ${settings.tanodNumber}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const officials = [
    [settings?.punongBarangay, settings?.punongTitle].filter(Boolean).join(", "),
    [settings?.secretaryName, settings?.secretaryTitle].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  const info: { icon: typeof MapPin; text: string }[] = [];
  if (address) info.push({ icon: MapPin, text: address });
  info.push({ icon: Clock, text: settings?.officeHours || t("hallHours") });
  if (phones) info.push({ icon: Phone, text: phones });
  if (officials) info.push({ icon: Users, text: officials });

  return (
    <div>
      {/* Hero */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              {t("heroText")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/file-complaint">
                  <FileText /> {t("btnFile")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/track-complaint">
                  <Search /> {t("btnTrack")}
                </Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("hallInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {info.map(({ icon: Icon, text }) => (
                <div key={text} className="flex gap-3 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p>{text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-semibold">{t("howTitle")}</h2>
          <ol className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {stepKeys.map((s, i) => (
              <li key={s.title} className="border-t pt-4">
                <h3 className="text-base font-semibold">
                  <span
                    aria-hidden="true"
                    className="mr-2 text-sm tabular-nums text-muted-foreground"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {t(s.title)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(s.text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* About */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-semibold">{t("aboutTitle")}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("aboutText")}
          </p>
          <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-3">
            {aboutKeys.map((item) => (
              <div key={item.title} className="border-t pt-4">
                <h3 className="text-base font-semibold">{t(item.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t(item.text)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notices + complaint types, stacked */}
      <section className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-14">
          <div>
            <h2 className="text-2xl font-semibold">{t("noticesTitle")}</h2>
            <div className="mt-6 space-y-4">
              {notices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noticesEmpty")}</p>
              ) : (
                notices.map((n) => (
                  <Card key={n.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <p className="text-sm uppercase text-muted-foreground">
                        {date(n.createdAt)}
                      </p>
                      <CardTitle className="text-base">{n.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="whitespace-pre-line text-sm text-muted-foreground">
                      {n.body}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("typesTitle")}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6">
              {complaintTypeKeys.map((k) => t(k)).join(" · ")}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("typesNote")}
            </p>
          </div>
        </div>
      </section>

      {/* Testimonies */}
      <section className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="text-2xl font-semibold">{t("testimoniesTitle")}</h2>
          <ul className="mt-6 divide-y">
            {testimonyKeys.map((item) => (
              <li key={item.name} className="py-6 first:pt-0 last:pb-0">
                <figure>
                  <blockquote className="text-sm leading-6">
                    “{t(item.quote)}”
                  </blockquote>
                  <figcaption className="mt-3 text-sm text-muted-foreground">
                    {t(item.name)} · {t(item.meta)}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            {t("testimoniesNote")}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="text-2xl font-semibold">{t("faqTitle")}</h2>
          <div className="mt-6 divide-y">
            {faqKeys.map((item) => (
              <details key={item.q} className="py-4 first:pt-0 last:pb-0">
                <summary className="cursor-pointer text-sm font-medium">
                  {t(item.q)}
                </summary>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t(item.a)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}