import { useRef, useState } from "react";
import {
  Form,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import {
  Calendar,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Notebook,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useT, type Key } from "@/lib/I18n";
import {
  clearRecentReferences,
  loadRecentReferences,
} from "../reference";
import type { TrackActionData } from "./action";

export default function Track() {
  const { t, lang } = useT();
  const data = useActionData() as TrackActionData | undefined;
  const submitting = useNavigation().state === "submitting";
  const [params] = useSearchParams();
  const [reference, setReference] = useState(() => params.get("ref") ?? "");
  const [recent, setRecent] = useState<string[]>(() => loadRecentReferences());
  const phoneRef = useRef<HTMLInputElement>(null);

  const statusLabel = (status: string) => {
    const key = `st_${status}` as Key;
    return t(key) || status;
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received":
        return <FileText className="h-8 w-8" />;
      case "summoned":
        return <Send className="h-8 w-8" />;
      case "mediation":
        return <Users className="h-8 w-8" />;
      case "conciliation":
        return <Users className="h-4 w-4" />;
      case "settled":
        return <CheckCircle2 className="h-8 w-8" />;
      case "certified":
        return <FileCheck2 className="h-8 w-8" />;
      case "dismissed":
        return <XCircle className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  const result = data?.result;
  const filedAt = result?.updates[0]?.createdAt;
  // The API stays chronological so the current status and filing date are easy
  // to derive; residents read the timeline newest-first.
  const history = result ? [...result.updates].reverse() : [];

  const downloadReference = () => {
    if (!result) return;

    const trackUrl = `${window.location.origin}/track-complaint?ref=${encodeURIComponent(result.reference)}`;
    const lines = [
      `${t("refNumber")}: ${result.reference}`,
      `${t("currentStatus")}: ${statusLabel(result.status)}`,
      ...(filedAt ? [`${t("filedDate")}: ${fmt(filedAt)}`] : []),
      "",
      t("downloadTrackAt"),
      trackUrl,
      "",
      t("downloadKeep"),
    ];

    const url = URL.createObjectURL(
      new Blob([`${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.reference}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("trackTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("trackIntro")}</p>

      <Form method="post" className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reference">{t("refNumber")}</Label>
          <Input
            id="reference"
            name="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="BK-2026-000001-K7"
            autoComplete="off"
            spellCheck={false}
            required
          />
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("trackRecent")}:
              </span>
              {recent.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setReference(item);
                    phoneRef.current?.focus();
                  }}
                  className="rounded-full border bg-background px-3 py-1 text-sm font-medium tabular-nums text-primary transition-colors hover:bg-muted"
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  clearRecentReferences();
                  setRecent([]);
                }}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("trackClearRecent")}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("phoneUsed")}</Label>
          <Input
            ref={phoneRef}
            id="phone"
            name="phone"
            type="tel"
            placeholder="0917 000 0000"
            required
          />
        </div>

        {data?.error && (
          <p className="text-sm text-destructive">{t(data.error)}</p>
        )}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? t("tracking") : t("trackBtn")}
        </Button>
        <p className="text-sm text-muted-foreground">{t("trackHelp")}</p>
      </Form>

      {result && (
        <div className="mt-10 space-y-6">
          {/* Reference + current status */}
          <Card>
            <CardHeader>
              <CardTitle>{t("complaintDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-md font-medium text-muted-foreground">
                  {t("refNumber")}
                </label>
                <div className="flex min-w-0 items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium tabular-nums sm:flex-none">
                    {result.reference}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={downloadReference}
                    aria-label={t("downloadRef")}
                    title={t("downloadRef")}
                  >
                    <Download className="size-3.5" />
                    {t("download")}
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <label className="text-md font-medium text-muted-foreground">
                  {t("currentStatus")}
                </label>
                <Badge variant="outline" className="font-bold">
                  {statusLabel(result.status)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Plain-language phase explanation */}
          <Card>
            <CardHeader>
              <CardTitle>{t("trackPhase")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/90">
                {t(`ph_${result.status}` as Key)}
              </p>
            </CardContent>
          </Card>

          {/* Status history timeline */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  {t("statusHistory")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {history.map((event, index) => (
                    <div key={index} className="relative flex gap-4">
                      {/* Timeline line */}
                      {index !== history.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-[-24px] w-px bg-border" />
                      )}

                      {/* Icon bubble */}
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background">
                        {getStatusIcon(event.status)}
                      </div>

                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="flex flex-col gap-2">
                          <Badge variant="outline" className="font-bold">
                            {statusLabel(event.status)}
                          </Badge>
                          <p className="text-md text-muted-foreground">
                            {fmt(event.createdAt)}
                          </p>
                        </div>

                        {(event.publicNote || event.hearingAt) && (
                          <div className="text-md">
                            {event.publicNote && (
                              <div className="flex items-center gap-2">
                                <Notebook className="h-4 w-4" />
                                <p className="text-foreground/80 leading-relaxed">
                                  {event.publicNote}
                                </p>
                              </div>
                            )}

                            {event.hearingAt && (
                              <>
                                {event.publicNote && <Separator className="my-2" />}
                                <div className="flex items-center gap-2 font-medium text-primary">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {t("hearing")}: {fmt(event.hearingAt)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {filedAt && (
            <div className="text-right text-sm text-muted-foreground">
              {t("filedDate")}: {fmt(filedAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
