import { useState, type ReactNode } from "react";
import { useLoaderData, useRevalidator, useRouteLoaderData, Link } from "react-router";
import { cn } from "cn";
import { CASE_WRITE_ROLES, type Role } from "@/lib/roles";
import { STATUS_ACTION } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintDetail } from "./loader";
import { StageAdvanceDialog, NoteDialog } from "./update";
import ReopenCaseModal from "./reopen";
import EligibilityCard from "./eligibility";
import PangkatCard from "./pangkat";
import ServiceRecordCard from "./service";
import { DOCUMENT_TYPES } from "../documents/loader";
import { complaintTypeLabel } from "../type-label";
import type { AdminLoaderData } from "@/layouts/admin/loader";

const NOW_MS = Date.now();

// Newest events are already first; show a window of them and page deeper.
const HISTORY_PAGE = 6;

function Fact({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  tone?: "plain" | "action";
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm font-medium tabular-nums",
          tone === "action" && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t pt-5 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CaseNavButton({
  caseId,
  to,
  label,
  icon,
}: {
  caseId: number | null;
  to: string;
  label: string;
  icon: ReactNode;
}) {
  if (caseId === null) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title={label}
        aria-label={label}
        className="px-2"
      >
        {icon}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="sm" title={label} className="px-2">
      <Link to={to} aria-label={label}>
        {icon}
      </Link>
    </Button>
  );
}

export default function ComplaintView() {
  const { t, lang } = useT();
  const complaint = useLoaderData() as ComplaintDetail;
  const revalidator = useRevalidator();
  const { user } = useRouteLoaderData("admin") as AdminLoaderData;
  const canWrite = !!user && CASE_WRITE_ROLES.includes(user.role as Role);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const evidence = complaint.evidence || [];
  const history = complaint.history || [];

  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE));
  const [page, setPage] = useState(1);
  // Revalidations can shrink history; keep the page in valid range.
  const safePage = Math.min(page, totalPages);
  const pageEvents = history.slice((safePage - 1) * HISTORY_PAGE, safePage * HISTORY_PAGE);

  const pageCount = t("historyPage")
    .replace("{page}", String(safePage))
    .replace("{pages}", String(totalPages));
  const historyCount = t("historyEvents").replace("{total}", String(history.length));

  const availableDocs = DOCUMENT_TYPES.filter((doc) => {
    if (doc === "settlement") return complaint.status === "settled";
    if (doc === "cfa") return complaint.status === "certified";
    if (doc === "notice") {
      return (
        ["mediation", "conciliation"].includes(complaint.status) ||
        !!complaint.nextHearingAt
      );
    }
    return ["received", "summoned"].includes(complaint.status);
  });

  const showServiceCard =
    (complaint.serviceRecords?.length ?? 0) > 0 ||
    !["received", "dismissed"].includes(complaint.status);

  // Mediation is handled by the Punong Barangay; the Pangkat is only formed at
  // conciliation, so keep the card out of the way unless one was recorded.
  const showPangkatCard =
    complaint.pangkatMembers.length > 0 ||
    !!complaint.pangkatChairman ||
    complaint.status === "conciliation";

  const isClosed = ["settled", "certified", "dismissed"].includes(complaint.status);

  const eligibilityHold =
    !isClosed &&
    (complaint.eligibilityStatus === "unreviewed" ||
      complaint.eligibilityStatus === "needs_review");

  const eligibilityFlagKey: Key =
    complaint.eligibilityStatus === "unreviewed"
      ? "eligUnscreenedFlag"
      : "eligPendingFlag";

  const isOverdue =
    !!complaint.dueAt &&
    new Date(complaint.dueAt).getTime() < NOW_MS &&
    !isClosed;

  return (
    <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6">
      {/* Sticky actions */}
      <div className="sticky -top-4 z-20 flex flex-wrap items-center justify-between gap-4 bg-background px-4 py-3 sm:-top-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <Link to="/admin/complaints">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("backToList")}
            </Link>
          </Button>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {canWrite && !eligibilityHold && (
            <>
              {!isClosed && (
                <StageAdvanceDialog
                  complaintId={complaint.id}
                  currentStatus={complaint.status}
                  onSuccess={() => revalidator.revalidate()}
                />
              )}
              <NoteDialog
                complaintId={complaint.id}
                currentStatus={complaint.status}
                onSuccess={() => revalidator.revalidate()}
              />
            </>
          )}
          {canWrite && isClosed && (
            <ReopenCaseModal
              complaintId={complaint.id}
              onSuccess={() => revalidator.revalidate()}
            />
          )}
          <div className="flex items-center gap-1">
            <CaseNavButton
              caseId={complaint.prevId}
              to={`/admin/complaints/${complaint.prevId}`}
              label={t("prevCase")}
              icon={<ChevronLeft className="h-4 w-4" />}
            />
            <CaseNavButton
              caseId={complaint.nextId}
              to={`/admin/complaints/${complaint.nextId}`}
              label={t("nextCase")}
              icon={<ChevronRight className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      <div className="space-y-10 p-4 pt-8 sm:p-6 sm:pt-10">
        {/* Title */}
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tabular-nums">{complaint.reference}</h1>
            {eligibilityHold ? (
              <Badge
                variant="outline"
                className={cn("gap-1", STATUS_ACTION)}
              >
                <ShieldAlert className="h-3 w-3" />
                {t(eligibilityFlagKey)}
              </Badge>
            ) : (
              <Badge>{t(`st_${complaint.status}` as Key)}</Badge>
            )}
          </div>

          <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <Fact
              label={t("complaintType")}
              value={complaintTypeLabel(
                complaint.complaintType,
                complaint.complaintTypeOther,
                t,
              )}
            />
            <Fact label={t("filedDate")} value={formatDateTime(complaint.createdAt)} />
            {complaint.nextHearingAt && (
              <Fact label={t("hearing")} value={formatDateTime(complaint.nextHearingAt)} />
            )}
            {complaint.dueAt ? (
              <Fact
                label={t("dueDate")}
                value={
                  <>
                    {formatDateTime(complaint.dueAt)}
                    {isOverdue && (
                      <span className={cn("ml-2 font-medium", STATUS_ACTION)}>
                        {t("overdue")}
                      </span>
                    )}
                  </>
                }
                tone={isOverdue ? "action" : "plain"}
              />
            ) : (
              <Fact
                label={isClosed ? t("caseClosed") : t("noDeadline")}
                value="—"
              />
            )}
          </dl>
        </div>

        <div
          className={cn(
            "mx-auto grid w-full grid-cols-1 items-start gap-6",
            history.length > 0
              ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_360px]"
              : "max-w-5xl",
          )}
        >
          <div className="flex flex-col gap-6">
            <EligibilityCard
              complaint={complaint}
              canWrite={canWrite}
              onSuccess={() => revalidator.revalidate()}
            />

            {showPangkatCard && (
              <PangkatCard
                complaint={complaint}
                canWrite={canWrite}
                onSuccess={() => revalidator.revalidate()}
              />
            )}

            {/* Documents */}
            {availableDocs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("documents")}</CardTitle>
                  <CardDescription>{t("documentsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {availableDocs.map((doc) => (
                      <Button key={doc} asChild variant="outline">
                        <Link to={`/admin/complaints/${complaint.id}/documents/${doc}`}>
                          {t(`doc_${doc}` as Key)}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {showServiceCard && (
              <ServiceRecordCard
                complaint={complaint}
                canWrite={canWrite}
                onSuccess={() => revalidator.revalidate()}
              />
            )}

            {/* As filed */}
            <Card>
              <CardHeader>
                <CardTitle>{t("asFiled")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Group title={t("s1Title")}>
                  <dl className="space-y-2">
                    <Field label={t("fullName")} value={complaint.complainantName} />
                    <Field label={t("age")} value={complaint.complainantAge} />
                    <Field label={t("purok")} value={complaint.complainantPurok} />
                    <Field label={t("contactNumber")} value={complaint.complainantContact} />
                    <Field label={t("address")} value={complaint.complainantAddress} />
                  </dl>
                </Group>

                <Group title={t("s2Title")}>
                  <dl className="space-y-2">
                    <Field label={t("respName")} value={complaint.respondentName} />
                    {complaint.respondentAddress && (
                      <Field label={t("respAddress")} value={complaint.respondentAddress} />
                    )}
                    {complaint.relationship && (
                      <Field label={t("relationship")} value={complaint.relationship} />
                    )}
                  </dl>
                </Group>

                <Group title={t("s3Title")}>
                  <dl className="space-y-2">
                    <Field
                      label={t("complaintType")}
                      value={complaintTypeLabel(
                        complaint.complaintType,
                        complaint.complaintTypeOther,
                        t,
                      )}
                    />
                    <Field label={t("incidentAt")} value={formatDateTime(complaint.incidentAt)} />
                    <Field label={t("place")} value={complaint.incidentPlace} />
                  </dl>
                </Group>

                <Group title={t("narrative")}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {complaint.description}
                  </p>
                </Group>

                {evidence.length > 0 && (
                  <Group title={t("evidence")}>
                    <ul className="divide-y">
                      {evidence.map((file, index) => (
                        <li key={index} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                          {file.mimeType.startsWith("image/") ? (
                            <img
                              src={file.url}
                              alt={file.originalName}
                              loading="lazy"
                              decoding="async"
                              className="size-10 shrink-0 rounded-md border object-cover"
                            />
                          ) : (
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border text-muted-foreground">
                              <FileText className="size-4" />
                            </span>
                          )}
                          <span
                            className="truncate text-sm font-medium"
                            title={file.originalName}
                          >
                            {file.originalName}
                          </span>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto shrink-0 text-sm font-medium text-primary hover:underline"
                          >
                            {t("evOpen")}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Group>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status History Timeline */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("statusHistory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground tabular-nums">
                  {pageCount} · {historyCount}
                </p>
                <ol className="space-y-6">
                  {pageEvents.map((event, index) => (
                    <li key={index} className="relative flex gap-4">
                      {/* Timeline Line */}
                      {index !== pageEvents.length - 1 && (
                        <div className="absolute left-[3px] top-3 bottom-[-24px] w-px bg-border" />
                      )}

                      <span className="relative z-10 mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/60" />

                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <Badge variant="outline" className="font-bold">
                            {event.kind === "service"
                              ? t("serviceHistoryLabel")
                              : t(`st_${event.status}` as Key)}
                          </Badge>
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatDateTime(event.date)}
                          </span>
                          {event.by && (
                            <span className="text-sm text-muted-foreground">
                              {t("historyBy")} {event.by}
                            </span>
                          )}
                        </div>

                        {event.note && (
                          <p className="text-sm leading-relaxed text-foreground/80">
                            {event.note}
                          </p>
                        )}

                        {event.hearingAt && (
                          <p className="text-sm font-medium">
                            {t("hearing")}: {formatDateTime(event.hearingAt)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {totalPages > 1 && (
                  <div className="mt-6 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                    >
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                      {t("prevPage")}
                    </Button>
                    <span className="text-center text-sm tabular-nums text-muted-foreground">
                      {pageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                    >
                      {t("nextPage")}
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
