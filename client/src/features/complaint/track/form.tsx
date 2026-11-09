import { useRef, useState } from "react";
import {
  Form,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { Download } from "lucide-react";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT, type Key } from "@/lib/I18n";
import { kindKeyForEntry } from "@/lib/session-kind";
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
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        {t("trackTitle")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("trackIntro")}</p>

      <Form method="post" className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reference">{t("refNumber")}</Label>
          <Input
            id="reference"
            name="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="26-10-0001"
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
                  className="rounded-full bg-muted/60 px-3 py-1 text-sm font-medium tabular-nums text-primary transition-colors hover:bg-primary/10 dark:text-status-ink"
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
        <div className="mt-12">
          <section>
            <h2 className="font-heading text-lg font-bold tracking-tight">
              {t("complaintDetails")}
            </h2>
            <div className="mt-4 rounded-xl bg-primary/5 px-5 py-6">
              <p className="text-sm text-muted-foreground">{t("refNumber")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3">
                <p className="font-heading text-2xl font-extrabold tracking-wider tabular-nums">
                  {result.reference}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadReference}
                  aria-label={t("downloadRef")}
                  title={t("downloadRef")}
                >
                  <Download className="size-3.5" />
                  {t("download")}
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-5">
                <p className="text-sm text-muted-foreground">
                  {t("currentStatus")}
                </p>
                <p className="font-heading text-sm font-bold text-primary dark:text-status-ink">
                  {statusLabel(result.status)}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-heading text-lg font-bold tracking-tight">
              {t("trackPhase")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {t(`ph_${result.status}` as Key)}
            </p>
          </section>

          {history.length > 0 && (
            <section className="mt-10">
              <h2 className="font-heading text-lg font-bold tracking-tight">
                {t("statusHistory")}
              </h2>
              <Timeline className="mt-6" value={1}>
                {history.map((event, index) => (
                  <TimelineItem key={index} step={index + 1}>
                    <TimelineDate dateTime={event.createdAt}>
                      {fmt(event.createdAt)}
                    </TimelineDate>
                    <TimelineIndicator />
                    <TimelineSeparator />
                    <TimelineTitle>{statusLabel(event.status)}</TimelineTitle>
                    {(event.publicNote || event.hearingAt) && (
                      <TimelineContent className="space-y-1.5">
                        {event.publicNote && (
                          <p className="text-sm leading-relaxed text-foreground/85">
                            {event.publicNote}
                          </p>
                        )}
                        {event.hearingAt && (
                          <p className="text-sm font-medium">
                            {t(kindKeyForEntry(event))}:{" "}
                            {fmt(event.hearingAt)}
                          </p>
                        )}
                      </TimelineContent>
                    )}
                  </TimelineItem>
                ))}
              </Timeline>
            </section>
          )}

          {filedAt && (
            <div className="mt-10 text-right text-sm text-muted-foreground">
              {t("filedDate")}: {fmt(filedAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
