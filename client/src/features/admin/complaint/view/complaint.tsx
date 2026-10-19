import type { ReactNode } from "react";
import { useLoaderData, useRevalidator, useRouteLoaderData, Link } from "react-router";
import { cn } from "cn";
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
} from "lucide-react";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintDetail } from "./loader";
import StatusUpdateModal from "./update";
import ReopenCaseModal from "./reopen";
import PrioritySelect from "./priority-select";
import { PRIORITY_STYLE } from "../priority";
import { DOCUMENT_TYPES } from "../documents/loader";
import type { CurrentUser } from "@/hooks/use-auth";

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export default function ComplaintView() {
  const { t, lang } = useT();
  const complaint = useLoaderData() as ComplaintDetail;
  const revalidator = useRevalidator();
  const user = useRouteLoaderData("admin") as CurrentUser | null;
  const canWrite = user?.role !== "secretary";

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const evidence = complaint.evidence || [];
  const history = complaint.history || [];

  const availableDocs = DOCUMENT_TYPES.filter((doc) => {
    if (doc === "settlement") return complaint.status === "settled";
    if (doc === "cfa") return complaint.status === "certified";
    return true;
  });

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

  const isOverdue =
    !!complaint.dueAt &&
    new Date(complaint.dueAt).getTime() < Date.now() &&
    !isClosed;

  return (
    <div className="-mx-6 -my-6">
      {/* Sticky actions */}
      <div className="sticky -top-6 z-20 flex flex-wrap items-center justify-between gap-4 border-b bg-background px-6 py-3">
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

        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <>
              <PrioritySelect
                complaintId={complaint.id}
                current={complaint.priority}
                onSuccess={() => revalidator.revalidate()}
              />
              <StatusUpdateModal
                complaintId={complaint.id}
                currentStatus={complaint.status}
                onSuccess={() => revalidator.revalidate()}
              />
              {isClosed && (
                <ReopenCaseModal
                  complaintId={complaint.id}
                  onSuccess={() => revalidator.revalidate()}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-6 p-6">
      {/* Title */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{t("complaintDetails")}</h1>
            <Badge>{t(`st_${complaint.status}` as Key)}</Badge>
            <Badge className={cn("border", PRIORITY_STYLE[complaint.priority])}>
              {t(`pr_${complaint.priority}` as Key)}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {complaint.reference} · {t(complaint.complaintType as Key)} ·{" "}
            {formatDateTime(complaint.createdAt)}
          </p>
        </div>

        {complaint.dueAt ? (
          <div className="flex items-center gap-2 text-sm">
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
          <p className="text-sm text-muted-foreground">{t("noDeadline")}</p>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Documents */}
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
          <Info label={t("complaintType")} value={t(complaint.complaintType as Key)} />
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
            <div className="space-y-6">
              {history.map((event, index) => (
                <div key={index} className="relative flex gap-4">
                  {/* Timeline Line */}
                  {index !== history.length - 1 && (
                    <div className="absolute left-3 top-8 bottom-[-24px] w-px bg-border" />
                  )}

                  {/* Icon Bubble */}
                  <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background">
                    {getStatusIcon(event.status)}
                  </div>

                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col gap-2">
                        <Badge variant="outline" className="font-bold">
                          {t(`st_${event.status}` as Key)}
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
          </CardContent>
        </Card>
      )}
      </div>
      </div>
    </div>
  );
}
