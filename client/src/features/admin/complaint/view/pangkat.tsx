import { useState } from "react";
import { toast } from "sonner";
import { readErrorMessage } from "@/lib/api-error";
import { Scale } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useT } from "@/lib/I18n";
import type { ComplaintDetail } from "./loader";

const CLOSED_STATUSES = ["settled", "certified", "dismissed"];

function PangkatModal({
  complaintId,
  currentChairman,
  onSuccess,
}: {
  complaintId: number;
  currentChairman: string | null;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentChairman ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) setName(currentChairman ?? "");
    setOpen(next);
  }

  const canSave = name.trim().length >= 2;

  async function handleSave() {
    if (!canSave) return;

    setIsSaving(true);
    try {
      await api
        .patch(`/complaints/${complaintId}/pangkat`, {
          json: { pangkatChairman: name.trim() },
        })
        .json();

      setOpen(false);
      toast.success(t("pangkatSaved"));
      onSuccess();
    } catch (error) {
      toast.error(readErrorMessage(error, t("pangkatSaveFailed")));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Scale className="mr-2 h-4 w-4" />
          {currentChairman ? t("pangkatEdit") : t("pangkatRecord")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("pangkatModalTitle")}</DialogTitle>
          <DialogDescription>{t("pangkatModalDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          <Label htmlFor="pangkatChairman">{t("pangkatChairmanLabel")}</Label>
          <Input
            id="pangkatChairman"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("pangkatChairmanPlaceholder")}
            maxLength={120}
          />
          <p className="text-sm text-muted-foreground">{t("pangkatChairmanHint")}</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !canSave}>
            {isSaving ? t("pangkatSaving") : t("pangkatSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PangkatCard({
  complaint,
  canWrite,
  onSuccess,
}: {
  complaint: ComplaintDetail;
  canWrite: boolean;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const isClosed = CLOSED_STATUSES.includes(complaint.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              {t("pangkatTitle")}
            </CardTitle>
            <CardDescription>{t("pangkatDesc")}</CardDescription>
          </div>
          {canWrite && !isClosed && (
            <PangkatModal
              complaintId={complaint.id}
              currentChairman={complaint.pangkatChairman}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {complaint.pangkatChairman ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{complaint.pangkatChairman}</p>
            <p className="text-sm text-muted-foreground">
              {t("pangkatChairmanLabel")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("pangkatEmpty")}</p>
        )}
      </CardContent>
    </Card>
  );
}
