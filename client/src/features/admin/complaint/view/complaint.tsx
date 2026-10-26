import { useState, type ReactNode } from "react";
import { useLoaderData, useRevalidator, useRouteLoaderData, Link } from "react-router";
import { cn } from "cn";
import { CASE_WRITE_ROLES, type Role } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Users,
  CheckCircle2,
  ArrowLeft,
  Download,
  Notebook,
  Send,
  FileCheck2,
  XCircle,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  MailCheck,
} from "lucide-react";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintDetail } from "./loader";
import { StageAdvanceDialog, NoteDialog } from "./update";
import ReopenCaseModal from "./reopen";
import EligibilityCard from "./eligibility";
import ServiceRecordCard from "./service";
import { DOCUMENT_TYPES } from "../documents/loader";
import { complaintTypeLabel } from "../type-label";
import type { AdminLoaderData } from "@/layouts/admin/loader";

const NOW_MS = Date.now();

// Newest events are already first; show a window of them and page deeper.
const HISTORY_PAGE = 6;

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received": return <FileText className="h-8 w-8 " />;
      case "summoned": return <Send className="h-8 w-8 " />;
      case "mediation": return <Users className="h-8 w-8 " />;
      case "conciliation": return <Users className="h-4 w-4 " />;
      case "settled": return <CheckCircle2 className="h-8 w-8 " />;
      case "certified": return <FileCheck2 className="h-8 w-8 " />;
      case "dismissed": return <XCircle className="h-8 w-8 " />;
      default: return <FileText className="h-8 w-8 " />;
    }
  };

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{complaint.reference}</h1>
              {eligibilityHold ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                  <ShieldAlert className="h-3 w-3" />
                  {t(eligibilityFlagKey)}
                </Badge>
              ) : (
                <Badge>{t(`st_${complaint.status}` as Key)}</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {complaintTypeLabel(complaint.complaintType, complaint.complaintTypeOther, t)} ·{" "}
              {formatDateTime(complaint.createdAt)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 text-sm">
            {complaint.nextHearingAt ? (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("hearing")}:</span>
                <span className="font-medium">
                  {formatDateTime(complaint.nextHearingAt)}
                </span>
              </div>
            ) : null}
            {complaint.dueAt ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("dueDate")}:</span>
                <span className="font-medium">{formatDateTime(complaint.dueAt)}</span>
                {isOverdue && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t("overdue")}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {isClosed ? t("caseClosed") : t("noDeadline")}
              </p>
            )}
          </div>
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
                          <FileText className="mr-2 h-4 w-4" />
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

            {/* People */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("complainant")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Info label={t("fullName")} value={complaint.complainantName} />
                  <Info label={t("age")} value={complaint.complainantAge} />
                  <Info label={t("purok")} value={complaint.complainantPurok} />
                  <Info label={t("contactNumber")} value={complaint.complainantContact} />
                  <div className="sm:col-span-2">
                    <Info label={t("address")} value={complaint.complainantAddress} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("respondent")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Info label={t("respName")} value={complaint.respondentName} />
                  </div>
                  {complaint.respondentAddress && (
                    <Info label={t("respAddress")} value={complaint.respondentAddress} />
                  )}
                  {complaint.relationship && (
                    <Info label={t("relationship")} value={complaint.relationship} />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Incident */}
            <Card>
              <CardHeader>
                <CardTitle>{t("s3Title")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <Info
                  label={t("complaintType")}
                  value={complaintTypeLabel(complaint.complaintType, complaint.complaintTypeOther, t)}
                />
                <Info label={t("incidentAt")} value={formatDateTime(complaint.incidentAt)} />
                <Info label={t("place")} value={complaint.incidentPlace} />
              </CardContent>
            </Card>

            {/* Narrative */}
            <Card>
              <CardHeader>
                <CardTitle>{t("narrative")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {complaint.description}
                </p>
              </CardContent>
            </Card>

            {/* Evidence */}
            {evidence.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("evidence")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {evidence.map((file, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-2 rounded-lg border p-3"
                      >
                        {file.mimeType.startsWith("image/") ? (
                          <img
                            src={file.url}
                            alt={file.originalName}
                            loading="lazy"
                            decoding="async"
                            className="h-32 w-full rounded-md bg-muted object-cover"
                          />
                        ) : (
                          <div className="flex h-32 w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <FileText className="h-8 w-8 opacity-50" />
                          </div>
                        )}
                        <p
                          className="truncate text-sm font-medium"
                          title={file.originalName}
                        >
                          {file.originalName}
                        </p>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="mt-auto w-full"
                        >
                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" /> View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Status History Timeline */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  {t("statusHistory")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground tabular-nums">
                  {pageCount} · {historyCount}
                </p>
                <div className="space-y-6">
                  {pageEvents.map((event, index) => (
                    <div key={index} className="relative flex gap-4">
                      {/* Timeline Line */}
                      {index !== pageEvents.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-[-24px] w-px bg-border" />
                      )}

                      {/* Icon Bubble */}
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background">
                        {event.kind === "service" ? (
                          <MailCheck className="h-6 w-6" />
                        ) : (
                          getStatusIcon(event.status)
                        )}
                      </div>

                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-col gap-2">
                            <Badge variant="outline" className="font-bold">
                              {event.kind === "service"
                                ? t("serviceHistoryLabel")
                                : t(`st_${event.status}` as Key)}
                            </Badge>
                            <p className="text-md text-muted-primary">
                              {formatDateTime(event.date)}
                            </p>
                            {event.by && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <span>updated by: </span>
                                <span>{event.by}</span>
                              </div>
                            )}
                          </div>

                        </div>

                        {/* Content Box */}
                        {(event.note || event.hearingAt) && (
                          <div className="text-md">
                            {event.note && (
                              <div className="flex items-center gap-2 text-md">
                                <Notebook className="h-4 w-4" />
                                <p className="text-foreground/80 leading-relaxed">{event.note}</p>
                              </div>
                            )}

                            {event.hearingAt && (
                              <>
                                {event.note && <Separator className="my-2" />}
                                <div className="flex items-center gap-2 text-md font-medium text-primary">
                                  <Calendar className="h-4 w-4" />
                                  <span>{t("hearing")}: {formatDateTime(event.hearingAt)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
