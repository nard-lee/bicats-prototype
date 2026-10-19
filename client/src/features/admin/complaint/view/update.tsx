import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import DateTimePicker from "@/components/ui/date-time-picker";
import { api } from "@/lib/api";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintStatus } from "./loader";

interface StatusUpdateModalProps {
  complaintId: number;
  currentStatus: ComplaintStatus;
  currentHearingAt?: string | null;
  onSuccess: () => void;
}

// ISO string -> "YYYY-MM-DDTHH:mm" in local time (the picker's value format).
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  received: ["summoned", "dismissed"],
  summoned: ["mediation", "dismissed"],
  mediation: ["settled", "conciliation", "dismissed"],
  conciliation: ["settled", "certified", "dismissed"],
  settled: [],
  certified: [],
  dismissed: [],
};

export default function StatusUpdateModal({ complaintId, currentStatus, currentHearingAt, onSuccess }: StatusUpdateModalProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [newStatus, setNewStatus] = useState<ComplaintStatus>(currentStatus);
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [hearingAt, setHearingAt] = useState<string>("");
  
  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logic Flags
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
  const canChangeStatus = allowedNextStatuses.length > 0;
  const canScheduleHearing = !["settled", "certified", "dismissed"].includes(currentStatus);

  // Check if any field in the main form has been modified
  const hasChanges = 
    (canChangeStatus && newStatus !== currentStatus) ||
    publicNote.trim().length > 0 ||
    internalNote.trim().length > 0 ||
    (canScheduleHearing && hearingAt !== isoToLocalInput(currentHearingAt));

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setNewStatus(currentStatus);
      setPublicNote("");
      setInternalNote("");
      setHearingAt(isoToLocalInput(currentHearingAt));
    }
  }, [open, currentStatus, currentHearingAt]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasChanges) return;

    setIsSubmitting(true);
    
    try {
      await api.patch(`/complaints/${complaintId}/status`, {
        json: {
          status: canChangeStatus ? newStatus : currentStatus,
          publicNote: publicNote || null,
          internalNote: internalNote || null,
          hearingAt: canScheduleHearing && hearingAt ? hearingAt : null,
        },
      });
      
      setOpen(false);
      toast.success("Status updated.");
      onSuccess();
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allStatuses: ComplaintStatus[] = [
    "received",
    "summoned",
    "mediation",
    "conciliation",
    "settled",
    "certified",
    "dismissed",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Update Status</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Case Details</DialogTitle>
          <DialogDescription>
            Add notes, schedule mediation, or move the case to the next stage.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={newStatus} 
              onValueChange={(val) => setNewStatus(val as ComplaintStatus)}
              disabled={!canChangeStatus}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {allStatuses.map((s) => {
                  const isAllowed = allowedNextStatuses.includes(s);
                  return (
                    <SelectItem 
                      key={s} 
                      value={s} 
                      disabled={!isAllowed && s !== currentStatus}
                    >
                      {t(`st_${s}` as Key)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {!canChangeStatus && (
              <p className="text-xs text-muted-foreground">
                This case is closed. You can only add notes.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="publicNote">Public Note / Resolution Summary</Label>
            <Textarea
              id="publicNote"
              placeholder="e.g., Parties reached an amicable settlement regarding boundary dispute."
              value={publicNote}
              onChange={(e) => setPublicNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="internalNote">Internal Note (Staff Only)</Label>
            <Textarea
              id="internalNote"
              placeholder="e.g., Respondent failed to appear during the first mediation."
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              className="bg-muted/50"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hearingAt">Next Mediation Date (Optional)</Label>
            <DateTimePicker
              id="hearingAt"
              value={hearingAt}
              onChange={setHearingAt}
              disabled={!canScheduleHearing}
              placeholder="Select date & time"
            />
            {!canScheduleHearing && (
              <p className="text-xs text-muted-foreground">
                Mediation cannot be scheduled for closed cases.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}