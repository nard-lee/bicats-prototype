import { useState } from "react";
import { toast } from "sonner";
import { readErrorMessage } from "@/lib/api-error";
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
import type { BarangaySettings } from "@/features/admin/setting/loader";

export type HearingDialogMode =
  | { type: "create"; date: Date }
  | { type: "edit"; hearing: HearingItem };

type Props = {
  mode: HearingDialogMode;
  complaints: ComplaintOption[];
  settings: BarangaySettings;
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
// A new row is either a booking or the record of a session that was already
// held. Calling a session off only makes sense on an existing booking.
const CREATE_STATUSES: HearingStatus[] = ["scheduled", "completed", "no_show"];

// Module-scope default so we don't call new Date() during render.
const NOW = new Date();

// ISO -> value for the DateTimePicker (local time, no timezone).
function isoToLocalInput(iso: string): string {
  return toLocalInput(new Date(iso));
}

function defaultInput(date: Date, settings: BarangaySettings): string {
  const hour = settings.enforceOfficeHours ? settings.officeStartHour : 9;
  return toLocalInput(
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0),
  );
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function outsideOfficeHours(
  value: string,
  settings: BarangaySettings,
): boolean {
  if (!settings.enforceOfficeHours || !value) return false;

  const date = new Date(value);
  const start = date.getHours() * 60 + date.getMinutes();
  return (
    start < settings.officeStartHour * 60 ||
    start + settings.hearingDurationMinutes > settings.officeEndHour * 60
  );
}

export default function HearingDialog({
  mode,
  complaints,
  settings,
  onClose,
  onSaved,
}: Props) {
  const editing = mode.type === "edit" ? mode.hearing : null;
  const caseClosed =
    !!editing &&
    ["settled", "certified", "dismissed"].includes(editing.complaintStatus);
  const finished =
    !!editing && (editing.status === "completed" || editing.status === "cancelled");
  // A finished session is a record of what happened, and a closed case has no
  // booking left to move; both keep everything but their notes.
  const scheduleLocked = !!editing && (finished || caseClosed);

  const [complaintId, setComplaintId] = useState(
    editing ? String(editing.complaintId) : complaints[0] ? String(complaints[0].id) : "",
  );
  const [scheduled, setScheduled] = useState(
    editing
      ? isoToLocalInput(editing.scheduledAt)
      : defaultInput(mode.type === "create" ? mode.date : NOW, settings),
  );
  const [kind, setKind] = useState<HearingKind>(editing?.kind ?? "mediation");
  const [status, setStatus] = useState<HearingStatus>(editing?.status ?? "scheduled");
  const [location, setLocation] = useState(
    editing ? (editing.location ?? "") : settings.defaultHearingLocation,
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [outcome, setOutcome] = useState(editing?.outcome ?? "");
  const [saving, setSaving] = useState(false);

  // Completed / no show mean the session already took place, which is what
  // makes a past date acceptable.
  const held = status === "completed" || status === "no_show";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scheduled || !complaintId) return;

    const past = new Date(scheduled).getTime() < Date.now();

    // A save that leaves the time alone must stay possible, even on a session
    // whose date already passed; only a move back in time is refused.
    if (editing && status !== "cancelled") {
      const moved = scheduled !== isoToLocalInput(editing.scheduledAt);
      const reactivating =
        editing.status !== "scheduled" && status === "scheduled";

      if (past && !held && (moved || reactivating)) {
        toast.error("A session can't be moved to a time that has already passed.");
        return;
      }
    } else if (!editing) {
      if (past && status === "scheduled") {
        toast.error(
          "A session can't be booked for a time that has already passed. Mark it completed or no show to record a session that was already held.",
        );
        return;
      }
      if (!past && held) {
        toast.error("A session that hasn't been held yet can only be scheduled.");
        return;
      }
    }

    if (!held && outsideOfficeHours(scheduled, settings)) {
      toast.error(
        `Sessions must fit within office hours (${hourLabel(settings.officeStartHour)}–${hourLabel(settings.officeEndHour)}).`,
      );
      return;
    }

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
            status,
            location: location || null,
            notes: notes || null,
            outcome: outcome || null,
          },
        });
        toast.success(held ? "Session recorded." : "Mediation scheduled.");
      }
      onSaved();
    } catch (err) {
      toast.error(readErrorMessage(err, "Something went wrong."));
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
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            This session date has passed with no outcome recorded. Set the status to
            Completed or No show, or pick a new date to reschedule it.
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 py-2">
          {!editing && (
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="complaint">Complaint</Label>
              <ComplaintPicker
                options={complaints}
                value={complaintId}
                onChange={setComplaintId}
              />
              {complaints.length === 0 && (
                <p className="text-sm text-muted-foreground">
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
              disabled={scheduleLocked}
              placeholder="Select date & time"
            />
            <p className="text-sm text-muted-foreground">
              {scheduleLocked
                ? caseClosed
                  ? "This case is closed, so its sessions are locked except for notes."
                  : "This session is finished. Only notes can be added."
                : settings.enforceOfficeHours
                  ? `Office hours: ${hourLabel(settings.officeStartHour)}–${hourLabel(settings.officeEndHour)} · ${settings.hearingDurationMinutes}-minute sessions`
                  : `${settings.hearingDurationMinutes}-minute sessions`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="kind">Type</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as HearingKind)}
                disabled={scheduleLocked}
              >
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

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as HearingStatus)}
                disabled={caseClosed}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(editing ? STATUSES : CREATE_STATUSES).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editing && (
                <p className="text-sm text-muted-foreground">
                  Choose Completed or No show to record a session that already took place.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Barangay Hall Session Room"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={scheduleLocked}
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

          {(editing || held) && (
            <div className="grid gap-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Textarea
                id="outcome"
                rows={2}
                placeholder="Result of the session (if completed)."
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                disabled={scheduleLocked}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {editing && editing.status === "scheduled" && !caseClosed && (
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
                    toast.error(readErrorMessage(err, "Something went wrong."));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Cancel mediation
              </Button>
            )}
            <Button type="submit" disabled={saving || !complaintId}>
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : held
                    ? "Record session"
                    : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
