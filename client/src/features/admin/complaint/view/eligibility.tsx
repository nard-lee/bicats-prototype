import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useT, type Key } from "@/lib/I18n";
import type {
  ComplaintDetail,
  ComplaintStatus,
  EligibilityAnswers,
  EligibilityStatus,
} from "./loader";

const CLOSED_STATUSES: ComplaintStatus[] = ["settled", "certified", "dismissed"];

const STATUS_STYLE: Record<EligibilityStatus, string> = {
  unreviewed: "border-muted-foreground/30 bg-muted text-muted-foreground",
  eligible:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  needs_review:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  outside_kp: "border-destructive/30 bg-destructive/10 text-destructive",
  rejected:
    "border-rose-600/40 bg-rose-600/15 text-rose-700 dark:text-rose-300",
};

const STATUS_KEY: Record<EligibilityStatus, Key> = {
  unreviewed: "eligNotScreened",
  eligible: "eligStatusEligible",
  needs_review: "eligStatusNeedsReview",
  outside_kp: "eligStatusOutside",
  rejected: "eligStatusRejected",
};

const RESIDENCY_KEY: Record<
  EligibilityAnswers["respondentResidency"],
  Key
> = {
  same_barangay: "eligResSameBarangay",
  same_city: "eligResSameCity",
  different_city: "eligResDifferentCity",
  unsure: "eligUnsure",
};

type ReviewStatus = "" | Exclude<EligibilityStatus, "unreviewed">;

function yesNoKey(value: "yes" | "no" | "unsure"): Key {
  if (value === "yes") return "eligYes";
  if (value === "no") return "eligNo";
  return "eligUnsure";
}

function propertyKey(value: EligibilityAnswers["propertyOutsideCity"]): Key {
  if (value === "yes") return "eligYes";
  if (value === "no") return "eligNo";
  if (value === "not_applicable") return "eligNa";
  return "eligUnsure";
}

function AnswerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function ReviewEligibilityModal({
  complaintId,
  currentStatus,
  currentNotes,
  currentReason,
  caseStatus,
  onSuccess,
}: {
  complaintId: number;
  currentStatus: EligibilityStatus;
  currentNotes: string | null;
  currentReason: string | null;
  caseStatus: ComplaintStatus;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ReviewStatus>("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const willDismiss =
    (status === "outside_kp" || status === "rejected") &&
    !CLOSED_STATUSES.includes(caseStatus);

  function handleOpenChange(next: boolean) {
    if (next) {
      setStatus(
        currentStatus === "unreviewed" ? "" : (currentStatus as ReviewStatus),
      );
      setNotes(currentNotes ?? "");
      setReason(currentReason ?? "");
    }
    setOpen(next);
  }

  async function handleSave() {
    if (!status) return;

    setIsSaving(true);
    try {
      await api.patch(`/complaints/${complaintId}/eligibility`, {
        json: {
          eligibilityStatus: status,
          eligibilityNotes: notes.trim() || null,
          eligibilityReason: status === "rejected" ? reason.trim() || null : null,
        },
      });
      setOpen(false);
      toast.success(willDismiss ? t("eligSavedDismissed") : t("eligSaved"));
      onSuccess();
    } catch (error) {
      console.error("Failed to update eligibility", error);
      toast.error(t("eligSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldCheck className="mr-2 h-4 w-4" />
          {t("eligReview")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("eligReviewTitle")}</DialogTitle>
          <DialogDescription>{t("eligReviewDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="eligibilityStatus">{t("eligReviewStatus")}</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ReviewStatus)}
            >
              <SelectTrigger id="eligibilityStatus">
                <SelectValue placeholder={t("eligReviewStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eligible">{t("eligStatusEligible")}</SelectItem>
                <SelectItem value="needs_review">
                  {t("eligStatusNeedsReview")}
                </SelectItem>
                <SelectItem value="outside_kp">
                  {t("eligStatusOutside")}
                </SelectItem>
                <SelectItem value="rejected">
                  {t("eligStatusRejected")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "rejected" && (
            <div className="grid gap-2">
              <Label htmlFor="eligibilityReason">{t("eligReason")}</Label>
              <Textarea
                id="eligibilityReason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("eligReasonPlaceholder")}
              />
              <p className="text-sm text-muted-foreground">
                {t("eligReasonHint")}
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="eligibilityNotes">{t("eligNotes")}</Label>
            <Textarea
              id="eligibilityNotes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("eligNotesHint")}
            />
          </div>

          {willDismiss && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {status === "rejected"
                ? t("eligRejectWarning")
                : t("eligDismissWarning")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSaving ||
              !status ||
              (status === "rejected" && reason.trim().length === 0)
            }
          >
            {isSaving ? t("eligSaving") : t("eligSaveReview")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EligibilityCard({
  complaint,
  canWrite,
  onSuccess,
}: {
  complaint: ComplaintDetail;
  canWrite: boolean;
  onSuccess: () => void;
}) {
  const { t, lang } = useT();
  const answers = complaint.eligibilityAnswers;
  const isClosed = CLOSED_STATUSES.includes(complaint.status);

  const reviewedAt = complaint.eligibilityReviewedAt
    ? new Date(complaint.eligibilityReviewedAt).toLocaleString(
        lang === "tl" ? "fil-PH" : "en-PH",
        { dateStyle: "medium", timeStyle: "short" },
      )
    : null;

  return (
    <Card
      className={cn(
        complaint.eligibilityStatus === "needs_review" &&
          "border-amber-500/40",
        complaint.eligibilityStatus === "outside_kp" && "border-destructive/40",
        complaint.eligibilityStatus === "rejected" && "border-destructive/40",
      )}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              {t("eligStaffTitle")}
            </CardTitle>
            <CardDescription>{t("eligStaffDesc")}</CardDescription>
          </div>
          <Badge className={cn("border", STATUS_STYLE[complaint.eligibilityStatus])}>
            {t(STATUS_KEY[complaint.eligibilityStatus])}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {answers ? (
          <div className="space-y-2">
            <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              {t("eligIntakeAnswers")}
            </p>
            <AnswerRow
              label={t("eligAnsResidency")}
              value={t(RESIDENCY_KEY[answers.respondentResidency])}
            />
            {answers.adjoiningAgreement && (
              <AnswerRow
                label={t("eligAnsAdjoining")}
                value={t(yesNoKey(answers.adjoiningAgreement))}
              />
            )}
            <AnswerRow
              label={t("eligAnsGovernment")}
              value={t(yesNoKey(answers.againstGovernment))}
            />
            <AnswerRow
              label={t("eligAnsOffense")}
              value={t(yesNoKey(answers.seriousOffenseOrVawc))}
            />
            <AnswerRow
              label={t("eligAnsProperty")}
              value={t(propertyKey(answers.propertyOutsideCity))}
            />
            {answers.propertyAgreement && (
              <AnswerRow
                label={t("eligAnsPropertyAgreement")}
                value={t(yesNoKey(answers.propertyAgreement))}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("eligNoAnswers")}</p>
        )}

        {complaint.eligibilityReason && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium tracking-wide text-destructive uppercase">
              {t("eligRejectionReason")}
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {complaint.eligibilityReason}
            </p>
          </div>
        )}

        {complaint.eligibilityNotes && (
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              {t("eligNotes")}
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {complaint.eligibilityNotes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {reviewedAt ? `${t("eligReviewed")} · ${reviewedAt}` : ""}
          </p>
          {isClosed ? (
            <p className="text-sm text-muted-foreground">{t("eligClosed")}</p>
          ) : (
            canWrite && (
              <ReviewEligibilityModal
                complaintId={complaint.id}
                currentStatus={complaint.eligibilityStatus}
                currentNotes={complaint.eligibilityNotes}
                currentReason={complaint.eligibilityReason}
                caseStatus={complaint.status}
                onSuccess={onSuccess}
              />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
