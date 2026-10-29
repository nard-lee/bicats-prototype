import { useState } from "react";
import { toast } from "sonner";
import { readErrorMessage } from "@/lib/api-error";
import { AlertTriangle, ArrowRight, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import DateTimePicker from "@/components/ui/date-time-picker";
import { cn } from "cn";
import { api } from "@/lib/api";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintStatus } from "./loader";

// Mirrors COMPLAINT_TRANSITIONS on the server; the server still enforces it.
const NEXT_STEPS: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  received: ["summoned", "dismissed"],
  summoned: ["mediation", "dismissed"],
  mediation: ["settled", "conciliation", "dismissed"],
  conciliation: ["settled", "certified", "dismissed"],
  settled: [],
  certified: [],
  dismissed: [],
};

const CLOSED_STATUSES: readonly ComplaintStatus[] = ["settled", "certified", "dismissed"];

interface StageAdvanceDialogProps {
  complaintId: number;
  currentStatus: ComplaintStatus;
  onSuccess: () => void;
}

export function StageAdvanceDialog({ complaintId, currentStatus, onSuccess }: StageAdvanceDialogProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ComplaintStatus | null>(null);
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [hearingAt, setHearingAt] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextSteps = NEXT_STEPS[currentStatus] ?? [];
  const closing = target !== null && CLOSED_STATUSES.includes(target);

  function resetForm() {
    setTarget(null);
    setPublicNote("");
    setInternalNote("");
    setHearingAt("");
    setShowNotes(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) resetForm();
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/complaints/${complaintId}/status`, {
        json: {
          status: target,
          publicNote: publicNote || null,
          internalNote: internalNote || null,
          hearingAt: !closing && hearingAt ? hearingAt : null,
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
                  "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                  target === step && "border-primary bg-primary/5 ring-1 ring-primary",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {t(`actTo_${step}` as Key)}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {t(`actTo_${step}Desc` as Key)}
                </span>
              </button>
            ))}
          </div>

          {target && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-3">
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
            <Button type="submit" disabled={!target || isSubmitting}>
              {isSubmitting ? t("saving") : target ? t(`actTo_${target}` as Key) : t("saveChanges")}
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
