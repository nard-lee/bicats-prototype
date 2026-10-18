import { Link, useLoaderData } from "react-router";
import { Clock, FileText, MapPin, Phone, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { complaintTypeKeys, useT, type Key } from "@/lib/I18n";
import type { PublicNoticesResponse } from "./loader";

const stepKeys: { title: Key; text: Key }[] = [
  { title: "step1Title", text: "step1Text" },
  { title: "step2Title", text: "step2Text" },
  { title: "step3Title", text: "step3Text" },
  { title: "step4Title", text: "step4Text" },
];

export default function Home() {
  const { t, lang } = useT();
  const { items: notices } = useLoaderData() as PublicNoticesResponse;

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
    });

  // Address, phone and officials are the same in both languages
  const info = [
    {
      icon: MapPin,
      text: "Barangay Hall, Purok 3, M. L. Quezon St., Barangay Kabayanihan, Santa Rosa, Laguna",
    },
    { icon: Clock, text: t("hallHours") },
    { icon: Phone, text: "Hotline (049) 502-1188 · Tanod 0917 845 2210" },
    {
      icon: Users,
      text: "Hon. Ricardo M. Villanueva, Punong Barangay · Ms. Aurora L. Dimaculangan, Barangay Secretary",
    },
  ];

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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stepKeys.map((s, i) => (
              <Card key={s.title}>
                <CardHeader>
                  <p className="text-2xl font-semibold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <CardTitle className="text-base">{t(s.title)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t(s.text)}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Notices + complaint types, stacked */}
      <section>
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
                      <p className="text-xs uppercase text-muted-foreground">
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
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {complaintTypeKeys.map((k) => (
                <div key={k} className="rounded-md border px-4 py-3 text-sm">
                  {t(k)}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("typesNote")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}