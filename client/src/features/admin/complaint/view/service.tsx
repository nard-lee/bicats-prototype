import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
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
import DateTimePicker from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toLocalInput } from "@/lib/datetime";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintDetail, ServiceResult } from "./loader";

const CLOSED_STATUSES = ["settled", "certified", "dismissed"];

const RESULT_STYLE: Record<ServiceResult, string> = {
  received:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  refused:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  not_found: "border-destructive/30 bg-destructive/10 text-destructive",
};

const RESULT_KEY: Record<ServiceResult, Key> = {
  received: "serviceReceived",
  refused: "serviceRefused",
  not_found: "serviceNotFound",
};

function RecordServiceModal({
  complaintId,
  caseStatus,
  onSuccess,
}: {
  complaintId: number;
  caseStatus: string;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [servedAt, setServedAt] = useState("");
  const [serverName, setServerName] = useState("");
  const [result, setResult] = useState<ServiceResult | "">("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setServedAt(toLocalInput(new Date()));
      setServerName("");
      setResult("");
      setNotes("");
    }
    setOpen(next);
  }

  const canSave =
    servedAt !== "" && serverName.trim().length >= 2 && result !== "";

  async function handleSave() {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const response = await api
        .post(`/complaints/${complaintId}/service-records`, {
          json: {
            servedAt,
            serverName: serverName.trim(),
            result,
            notes: notes.trim() || null,
          },
        })
        .json<{ deadlineUpdated: boolean }>();

      setOpen(false);
      toast.success(
        response.deadlineUpdated ? t("serviceSavedDeadline") : t("serviceSaved"),
      );
      onSuccess();
    } catch (error) {
      console.error("Failed to record proof of service", error);
      toast.error(t("serviceSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MailCheck className="mr-2 h-4 w-4" />
          {t("serviceRecord")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("serviceModalTitle")}</DialogTitle>
          <DialogDescription>{t("serviceModalDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="serverName">{t("serviceServer")}</Label>
            <Input
              id="serverName"
              value={serverName}
              onChange={(event) => setServerName(event.target.value)}
              placeholder={t("serviceServerPlaceholder")}
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="servedAt">{t("serviceDate")}</Label>
            <DateTimePicker
              id="servedAt"
              value={servedAt}
              onChange={setServedAt}
              placeholder={t("serviceDatePlaceholder")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="serviceResult">{t("serviceResult")}</Label>
            <Select
              value={result}
              onValueChange={(value) => setResult(value as ServiceResult)}
            >
              <SelectTrigger id="serviceResult">
                <SelectValue placeholder={t("serviceResultPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">{t("serviceReceived")}</SelectItem>
                <SelectItem value="refused">{t("serviceRefused")}</SelectItem>
                <SelectItem value="not_found">{t("serviceNotFound")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {caseStatus === "summoned" && result === "received" && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              {t("serviceDeadlineHint")}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="serviceNotes">{t("serviceNotes")}</Label>
            <Textarea
              id="serviceNotes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("serviceNotesPlaceholder")}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !canSave}>
            {isSaving ? t("serviceSaving") : t("serviceSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ServiceRecordCard({
  complaint,
  canWrite,
  onSuccess,
}: {
  complaint: ComplaintDetail;
  canWrite: boolean;
  onSuccess: () => void;
}) {
  const { t, lang } = useT();
  const records = complaint.serviceRecords ?? [];
  const isClosed = CLOSED_STATUSES.includes(complaint.status);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-muted-foreground" />
              {t("serviceTitle")}
            </CardTitle>
            <CardDescription>{t("serviceDesc")}</CardDescription>
          </div>
          {canWrite && !isClosed && (
            <RecordServiceModal
              complaintId={complaint.id}
              caseStatus={complaint.status}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isClosed && (
          <p className="text-xs text-muted-foreground">{t("serviceClosed")}</p>
        )}

        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("serviceEmpty")}</p>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="rounded-md border bg-muted/30 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{record.serverName}</p>
                <Badge
                  className={cn("border", RESULT_STYLE[record.result])}
                >
                  {t(RESULT_KEY[record.result])}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("serviceDateTime")} · {formatDateTime(record.servedAt)}
              </p>
              {record.notes && (
                <p className="mt-2 text-sm whitespace-pre-wrap">{record.notes}</p>
              )}
              {record.createdBy && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("serviceLoggedBy")}: {record.createdBy}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
