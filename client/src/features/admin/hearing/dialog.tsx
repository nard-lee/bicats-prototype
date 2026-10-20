import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import DateTimePicker from "@/components/ui/date-time-picker";
import { toLocalInput } from "@/lib/datetime";
import { KIND_LABEL, STATUS_LABEL } from "./labels";
import ComplaintPicker from "./complaint-picker";
import type { ComplaintOption, HearingItem, HearingKind, HearingStatus } from "./loader";

export type HearingDialogMode =
  | { type: "create"; date: Date }
  | { type: "edit"; hearing: HearingItem };

type Props = {
  mode: HearingDialogMode;
  complaints: ComplaintOption[];
  onClose: () => void;
  onSaved: () => void;
};

const KINDS: HearingKind[] = ["mediation", "conciliation", "hearing"];
const STATUSES: HearingStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
];

// Module-scope default so we don't call new Date() during render.
const NOW = new Date();

// ISO -> value for the DateTimePicker (local time, no timezone).
function isoToLocalInput(iso: string): string {
  return toLocalInput(new Date(iso));
}

function defaultInput(date: Date): string {
  return toLocalInput(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0));
}

async function readError(err: unknown): Promise<string> {
  const response = (err as { response?: Response })?.response;
  if (response) {
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      return data.error ?? data.message ?? "Something went wrong.";
    } catch {
      /* fall through */
    }
  }
  return "Something went wrong.";
}

export default function HearingDialog({ mode, complaints, onClose, onSaved }: Props) {
  const editing = mode.type === "edit" ? mode.hearing : null;

  const [complaintId, setComplaintId] = useState(
    editing ? String(editing.complaintId) : complaints[0] ? String(complaints[0].id) : "",
  );
  const [scheduled, setScheduled] = useState(
    editing ? isoToLocalInput(editing.scheduledAt) : defaultInput(mode.type === "create" ? mode.date : NOW),
  );
  const [kind, setKind] = useState<HearingKind>(editing?.kind ?? "mediation");
  const [status, setStatus] = useState<HearingStatus>(editing?.status ?? "scheduled");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [outcome, setOutcome] = useState(editing?.outcome ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scheduled || !complaintId) return;

    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/hearings/${editing.id}`, {
          json: {
            scheduledAt: new Date(scheduled).toISOString(),
            kind,
            status,
            location: location || null,
            notes: notes || null,
            outcome: outcome || null,
          },
        });
        toast.success("Mediation updated.");
      } else {
        await api.post("/hearings", {
          json: {
            complaintId: Number(complaintId),
            scheduledAt: new Date(scheduled).toISOString(),
            kind,
            location: location || null,
            notes: notes || null,
          },
        });
        toast.success("Mediation scheduled.");
      }
      onSaved();
    } catch (err) {
      toast.error(await readError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Mediation" : "Schedule Mediation"}</DialogTitle>
          <DialogDescription>
            {editing ? (
              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-base font-semibold tracking-wide text-foreground">
                  {editing.reference}
                </span>
                <span>
                  · {editing.complainantName} and {editing.respondentName}
                </span>
              </span>
            ) : (
              "Set a mediation, conciliation, or arbitration session for a case."
            )}
          </DialogDescription>
        </DialogHeader>

        {editing?.overdue && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            This session date has passed with no outcome recorded. Set the status to
            Completed or No show, or pick a new date to reschedule it.
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 py-2">
          {!editing && (
            <div className="grid gap-2">
              <Label htmlFor="complaint">Complaint</Label>
              <ComplaintPicker
                options={complaints}
                value={complaintId}
                onChange={setComplaintId}
              />
              {complaints.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No open cases are available to schedule.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="scheduled">Date &amp; time</Label>
            <DateTimePicker
              id="scheduled"
              value={scheduled}
              onChange={setScheduled}
              placeholder="Select date & time"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="kind">Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as HearingKind)}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editing && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as HearingStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Barangay Hall Session Room"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Agenda or reminders for this session."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {editing && (
            <div className="grid gap-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Textarea
                id="outcome"
                rows={2}
                placeholder="Result of the session (if completed)."
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {editing && editing.status !== "cancelled" && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await api.delete(`/hearings/${editing.id}`);
                    toast.success("Mediation cancelled.");
                    onSaved();
                  } catch (err) {
                    toast.error(await readError(err));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Cancel mediation
              </Button>
            )}
            <Button type="submit" disabled={saving || !complaintId}>
              {saving ? "Saving..." : editing ? "Save changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
