import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

interface ReopenCaseModalProps {
  complaintId: number;
  onSuccess: () => void;
}

export default function ReopenCaseModal({ complaintId, onSuccess }: ReopenCaseModalProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  async function handleReopen() {
    if (!reason.trim()) {
      toast.error("Please provide a reason for reopening.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/complaints/${complaintId}/reopen`, {
        json: { reason },
      });
      setOpen(false);
      toast.success("Case reopened.");
      onSuccess();
    } catch (error) {
      console.error("Failed to reopen case", error);
      toast.error("Failed to reopen case.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reopen Case
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Reopen Case</DialogTitle>
          <DialogDescription>
            Use this if the respondent failed to comply with the settlement or if new evidence
            has emerged. Reopening returns the case to active mediation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          <Label htmlFor="reopenReason">Reason for reopening</Label>
          <Textarea
            id="reopenReason"
            rows={4}
            placeholder="e.g., Non-compliance with the Amicable Settlement"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReopen}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? "Reopening..." : "Reopen Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
