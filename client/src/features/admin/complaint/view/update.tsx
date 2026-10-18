import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintStatus } from "./loader";

interface StatusUpdateModalProps {
  complaintId: number;
  currentStatus: ComplaintStatus;
  onSuccess: () => void;
}

const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  received: ["under_mediation", "dismissed"],
  under_mediation: ["settled", "endorsed", "dismissed"],
  settled: [],
  endorsed: [],
  dismissed: [],
};

export default function StatusUpdateModal({ complaintId, currentStatus, onSuccess }: StatusUpdateModalProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [newStatus, setNewStatus] = useState<ComplaintStatus>(currentStatus);
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [hearingAt, setHearingAt] = useState<string>("");
  
  // Reopen State
  const [reopenReason, setReopenReason] = useState("");
  
  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  // Logic Flags
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
  const canChangeStatus = allowedNextStatuses.length > 0;
  const canScheduleHearing = !["settled", "dismissed", "endorsed"].includes(currentStatus);
  const isClosed = ["settled", "dismissed", "endorsed"].includes(currentStatus);

  // Check if any field in the main form has been modified
  const hasChanges = 
    (canChangeStatus && newStatus !== currentStatus) ||
    publicNote.trim().length > 0 ||
    internalNote.trim().length > 0 ||
    (canScheduleHearing && hearingAt.length > 0);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setNewStatus(currentStatus);
      setPublicNote("");
      setInternalNote("");
      setHearingAt("");
      setReopenReason("");
    }
  }, [open, currentStatus]);

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

  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      toast.error("Please provide a reason for reopening.");
      return;
    }
    setIsReopening(true);
    try {
      await api.post(`/complaints/${complaintId}/reopen`, {
        json: { reason: reopenReason },
      });
      setOpen(false);
      toast.success("Case reopened.");
      onSuccess();
    } catch (error) {
      console.error("Failed to reopen case", error);
      toast.error("Failed to reopen case.");
    } finally {
      setIsReopening(false);
    }
  };

  const allStatuses: ComplaintStatus[] = [
    "received",
    "under_mediation",
    "settled",
    "endorsed",
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
            Add notes, schedule hearings, or move the case to the next stage.
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
              placeholder="e.g., Respondent failed to appear during the first hearing."
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              className="bg-muted/50"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hearingAt">Next Hearing Date (Optional)</Label>
            <input
              id="hearingAt"
              type="datetime-local"
              disabled={!canScheduleHearing}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                !canScheduleHearing ? "opacity-50 cursor-not-allowed" : ""
              }`}
              value={hearingAt}
              onChange={(e) => setHearingAt(e.target.value)}
            />
            {!canScheduleHearing && (
              <p className="text-xs text-muted-foreground">
                Hearings cannot be scheduled for closed or endorsed cases.
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

        {/* REOPEN SECTION */}
        {isClosed && (
          <div className="mt-2">
            <Separator className="my-4" />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-destructive">Reopen Case</h4>
              <p className="text-xs text-muted-foreground">
                Use this if the respondent failed to comply with the settlement or if new evidence has emerged.
              </p>
              <Textarea
                placeholder="Reason for reopening (e.g., Non-compliance with Amicable Settlement)"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="border-destructive/20 focus-visible:ring-destructive/20"
              />
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleReopen} 
                disabled={isReopening || !reopenReason.trim()}
                className="w-full sm:w-auto"
              >
                {isReopening ? "Reopening..." : "Reopen Case"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}