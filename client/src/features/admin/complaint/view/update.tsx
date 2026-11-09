import { useState } from "react";
import { toast } from "sonner";
import { readErrorMessage } from "@/lib/api-error";
import { AlertTriangle, ArrowRight, NotebookPen, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import DateTimePicker from "@/components/ui/date-time-picker";
import { cn } from "cn";
import { api } from "@/lib/api";
import { toDateInput } from "@/lib/datetime";
import { useT, type Key } from "@/lib/I18n";
import {
  choiceFromPanel,
  isPangkatComplete,
  type PangkatChoice,
} from "@/lib/pangkat";
import { PangkatPicker } from "./pangkat";
import type {
  ArbitrationMode,
  ComplaintStatus,
  PangkatMember,
} from "./loader";

// Mirrors COMPLAINT_TRANSITIONS on the server; the server still enforces it.
const NEXT_STEPS: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  received: ["summoned", "dismissed"],
  summoned: ["mediation", "dismissed"],
  mediation: ["settled", "conciliation", "arbitration", "dismissed"],
  conciliation: ["settled", "arbitration", "certified", "dismissed"],
  arbitration: ["settled", "certified", "dismissed"],
  settled: [],
  certified: [],
  dismissed: [],
};

const CLOSED_STATUSES: readonly ComplaintStatus[] = ["settled", "certified", "dismissed"];

// Closing from arbitration records an award, not an amicable settlement, and
// the barangay reads the difference on the button.
function stepKeys(current: ComplaintStatus, step: ComplaintStatus): [Key, Key] {
  if (step === "settled" && current === "arbitration") {
    return ["actTo_settledAward", "actTo_settledAwardDesc"];
  }
  return [`actTo_${step}` as Key, `actTo_${step}Desc` as Key];
}

interface StageAdvanceDialogProps {
  complaintId: number;
  currentStatus: ComplaintStatus;
  panel: PangkatMember[];
  onSuccess: () => void;
}

// Sec. 413 gives the parties two arbiters, and the choice decides whether the
// step into arbitration also has to name a panel: the Pangkat hears it under
// §413(b), the Punong Barangay alone under §413(a).
const ARBITRATION_MODES: readonly ArbitrationMode[] = [
  "punong_barangay",
  "pangkat",
];

// Module-scope so we don't call new Date() during render. The agreement the
// parties sign is always backdated, never scheduled.
const TODAY = toDateInput(new Date());

export function StageAdvanceDialog({ complaintId, currentStatus, panel, onSuccess }: StageAdvanceDialogProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ComplaintStatus | null>(null);
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [hearingAt, setHearingAt] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [choice, setChoice] = useState<PangkatChoice>({
    memberIds: [],
    chairmanId: null,
  });
  const [arbitrationBy, setArbitrationBy] = useState<ArbitrationMode | null>(null);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [agreementAt, setAgreementAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextSteps = NEXT_STEPS[currentStatus] ?? [];
  const closing = target !== null && CLOSED_STATUSES.includes(target);
  const toArbitration = target === "arbitration";
  const hasPanel = isPangkatComplete(choiceFromPanel(panel));
  // Conciliation is always the Pangkat's; an arbitration is only when the
  // parties gave it the panel.
  const wantsPanel =
    target === "conciliation" || (toArbitration && arbitrationBy === "pangkat");
  const needsPanel = wantsPanel && !hasPanel;
  const panelReady = !needsPanel || isPangkatComplete(choice);
  // §413 opens with the parties' written agreement, so the step that enters the
  // stage records who hears it and the date on that agreement.
  const arbitrationReady =
    !toArbitration || (arbitrationBy !== null && agreementSigned && agreementAt !== "");
  const readyToAdvance = panelReady && arbitrationReady;

  function resetForm() {
    setTarget(null);
    setPublicNote("");
    setInternalNote("");
    setHearingAt("");
    setShowNotes(false);
    setChoice({ memberIds: [], chairmanId: null });
    setArbitrationBy(null);
    setAgreementSigned(false);
    setAgreementAt("");
  }

  function handleOpenChange(next: boolean) {
    if (next) resetForm();
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target || !readyToAdvance || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/complaints/${complaintId}/status`, {
        json: {
          status: target,
          publicNote: publicNote || null,
          internalNote: internalNote || null,
          hearingAt: !closing && hearingAt ? hearingAt : null,
          ...(toArbitration
            ? { arbitrationBy, arbitrationAgreementAt: agreementAt }
            : {}),
          ...(needsPanel
            ? { memberIds: choice.memberIds, chairmanId: choice.chairmanId }
            : {}),
        },
      });

      setOpen(false);
      toast.success(t("updSaved"));
      onSuccess();
    } catch (error) {
      toast.error(readErrorMessage(error, t("updSaveFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <ArrowRight className="mr-2 h-4 w-4" />
          {t("updAdvance")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("updStageTitle")}</DialogTitle>
          <DialogDescription>{t("updStageDesc")}</DialogDescription>
          <div className="flex items-center gap-2 pt-1 text-sm font-normal">
            <span className="text-muted-foreground">{t("updCurrentStage")}:</span>
            <Badge variant="outline">{t(`st_${currentStatus}` as Key)}</Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            {nextSteps.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setTarget(step)}
                aria-pressed={target === step}
                className={cn(
                  "w-full rounded-lg p-3 text-left transition-colors",
                  target === step
                    ? "bg-primary/10 text-primary dark:text-status-ink"
                    : "bg-muted/40 hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {t(stepKeys(currentStatus, step)[0])}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {t(stepKeys(currentStatus, step)[1])}
                </span>
              </button>
            ))}
          </div>

          {target && (
            <div className="space-y-4 rounded-lg bg-primary/5 p-3">
              {toArbitration && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t("updArbByLabel")}</p>
                  <div className="grid gap-2">
                    {ARBITRATION_MODES.map((mode) => {
                      const picked = arbitrationBy === mode;
                      return (
                        <label
                          key={mode}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                            picked
                              ? "border-primary/40 bg-primary/5 font-medium text-primary dark:text-status-ink"
                              : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                          )}
                        >
                          <input
                            type="radio"
                            name="arbitrationBy"
                            checked={picked}
                            onChange={() => setArbitrationBy(mode)}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card",
                              picked ? "border-primary dark:border-status-ink" : "border-input",
                            )}
                          >
                            {picked && (
                              <span className="size-2 rounded-full bg-primary dark:bg-status-ink" />
                            )}
                          </span>
                          <span>
                            <span className="block">{t(`arbBy_${mode}` as Key)}</span>
                            <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                              {t(`arbBy_${mode}Desc` as Key)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="arbSigned"
                      checked={agreementSigned}
                      onCheckedChange={(value) => setAgreementSigned(value === true)}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1">
                      <Label htmlFor="arbSigned" className="font-normal">
                        {t("updArbSigned")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("updArbSignedHint")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="arbAgreementAt">{t("updArbDate")}</Label>
                    <Input
                      id="arbAgreementAt"
                      type="date"
                      value={agreementAt}
                      max={TODAY}
                      onChange={(event) => setAgreementAt(event.target.value)}
                      // The picker sits inside the advance form, where Enter
                      // would submit the stage change mid-entry.
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                      }}
                      className="h-10 w-full sm:w-[200px]"
                    />
                  </div>
                </div>
              )}

              {wantsPanel &&
                (hasPanel ? (
                  <p className="text-sm text-muted-foreground">
                    {t("updPangkatRecorded")}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="flex items-start gap-2 text-sm text-status-ink">
                      <Scale className="mt-0.5 h-4 w-4 shrink-0" />
                      {t("updPangkatNeeded")}
                    </p>
                    <PangkatPicker initial={choice} onChange={setChoice} />
                  </div>
                ))}

              {closing ? (
                <p className="flex items-start gap-2 text-sm text-status-ink">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("updClosingNote")}
                </p>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="labHearing">
                    {t("updNextSession")}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({t("updOptional")})
                    </span>
                  </Label>
                  <DateTimePicker
                    id="labHearing"
                    value={hearingAt}
                    onChange={setHearingAt}
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-muted-foreground">{t("updNextSessionHint")}</p>
                </div>
              )}

              {showNotes ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="labPublic">{t("updPublicNote")}</Label>
                    <Textarea
                      id="labPublic"
                      placeholder={t("updPublicNotePh")}
                      value={publicNote}
                      onChange={(e) => setPublicNote(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="labInternal">{t("updInternalNote")}</Label>
                    <Textarea
                      id="labInternal"
                      placeholder={t("updInternalNotePh")}
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      rows={2}
                      className="bg-muted/50"
                    />
                  </div>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNotes(true)}
                  className="w-full border-dashed"
                >
                  <NotebookPen className="mr-2 h-4 w-4" />
                  {t("updAddNote")}
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({t("updOptional")})
                  </span>
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("updCancel")}
            </Button>
            <Button type="submit" disabled={!target || !readyToAdvance || isSubmitting}>
              {isSubmitting
                ? t("saving")
                : target
                  ? t(stepKeys(currentStatus, target)[0])
                  : t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface NoteDialogProps {
  complaintId: number;
  currentStatus: ComplaintStatus;
  onSuccess: () => void;
}

export function NoteDialog({ complaintId, currentStatus, onSuccess }: NoteDialogProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasNote = publicNote.trim().length > 0 || internalNote.trim().length > 0;

  function handleOpenChange(next: boolean) {
    if (next) {
      setPublicNote("");
      setInternalNote("");
    }
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasNote || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // A note-only save: the server keeps the stage's deadline untouched.
      await api.patch(`/complaints/${complaintId}/status`, {
        json: {
          status: currentStatus,
          publicNote: publicNote || null,
          internalNote: internalNote || null,
          hearingAt: null,
        },
      });

      setOpen(false);
      toast.success(t("updSaved"));
      onSuccess();
    } catch (error) {
      toast.error(readErrorMessage(error, t("updSaveFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <NotebookPen className="mr-2 h-4 w-4" />
          {t("updAddNote")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("updNoteTitle")}</DialogTitle>
          <DialogDescription>{t("updNoteDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="notePublic">{t("updPublicNote")}</Label>
            <Textarea
              id="notePublic"
              placeholder={t("updPublicNotePh")}
              value={publicNote}
              onChange={(e) => setPublicNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="noteInternal">{t("updInternalNote")}</Label>
            <Textarea
              id="noteInternal"
              placeholder={t("updInternalNotePh")}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              className="bg-muted/50"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("updCancel")}
            </Button>
            <Button type="submit" disabled={!hasNote || isSubmitting}>
              {isSubmitting ? t("saving") : t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
