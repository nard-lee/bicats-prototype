import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useT } from "@/lib/I18n";
import { api } from "@/lib/api";
import { ATTENDANCE_LABEL, KIND_LABEL } from "./labels";
import type { AttendanceStatus, HearingItem } from "./loader";

type Props = {
  hearing: HearingItem;
  onClose: () => void;
  onSaved: () => void;
};

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["present", "absent", "excused"];

async function readError(err: unknown): Promise<string> {
  const e = err as { data?: { message?: string }; response?: Response };
  if (e.data?.message) return e.data.message;
  if (e.response) {
    try {
      const data = (await e.response.clone().json()) as { message?: string };
      if (data.message) return data.message;
    } catch {
      /* fall through */
    }
  }
  return "Could not save attendance.";
}

export default function AttendanceDialog({ hearing, onClose, onSaved }: Props) {
  const { lang } = useT();
  const locale = lang === "tl" ? "fil-PH" : "en-PH";

  const [complainant, setComplainant] = useState<AttendanceStatus | "">(
    hearing.complainantAttendance ?? "",
  );
  const [respondent, setRespondent] = useState<AttendanceStatus | "">(
    hearing.respondentAttendance ?? "",
  );
  const [notes, setNotes] = useState(hearing.attendanceNotes ?? "");
  const [saving, setSaving] = useState(false);

  const scheduled = new Date(hearing.scheduledAt).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!complainant || !respondent) return;

    setSaving(true);
    try {
      const saved = await api
        .put(`/hearings/${hearing.id}/attendance`, {
          json: {
            complainant,
            respondent,
            notes: notes || null,
          },
        })
        .json<{ status: string; statusChanged: boolean }>();

      if (!saved.statusChanged) {
        toast.success("Attendance saved.");
      } else if (saved.status === "no_show") {
        toast.success("Attendance saved. Session marked as no show.");
      } else {
        toast.success("Attendance saved. Session marked completed.");
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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Record attendance</DialogTitle>
          <DialogDescription>
            <span className="block text-sm font-semibold tracking-wide text-foreground">
              {hearing.reference} · {KIND_LABEL[hearing.kind]} · {scheduled}
            </span>
            <span className="mt-1 block">
              {hearing.complainantName} and {hearing.respondentName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="complainant-attendance">Complainant</Label>
              <Select
                value={complainant}
                onValueChange={(value) =>
                  setComplainant(value as AttendanceStatus)
                }
              >
                <SelectTrigger id="complainant-attendance">
                  <SelectValue placeholder="Select attendance" />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {ATTENDANCE_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="respondent-attendance">Respondent</Label>
              <Select
                value={respondent}
                onValueChange={(value) =>
                  setRespondent(value as AttendanceStatus)
                }
              >
                <SelectTrigger id="respondent-attendance">
                  <SelectValue placeholder="Select attendance" />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {ATTENDANCE_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="attendance-notes">Notes</Label>
            <Textarea
              id="attendance-notes"
              rows={2}
              placeholder="e.g., Respondent arrived late; complainant attended with a representative."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Saving attendance also sets the session outcome: completed when at
            least one party attended, no show when neither did.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !complainant || !respondent}>
              {saving ? "Saving..." : "Save attendance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
