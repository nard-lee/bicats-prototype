import { useState } from "react";
import { Flag, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { useT, type Key } from "@/lib/I18n";
import { PRIORITIES, type ComplaintPriority } from "../priority";

type Props = {
  complaintId: number;
  current: ComplaintPriority;
  onSuccess: () => void;
};

export default function PrioritySelect({ complaintId, current, onSuccess }: Props) {
  const { t } = useT();
  const [saving, setSaving] = useState(false);

  const change = async (value: string) => {
    if (value === current) return;

    setSaving(true);
    try {
      await api.patch(`/complaints/${complaintId}/priority`, {
        json: { priority: value },
      });
      toast.success("Priority updated.");
      onSuccess();
    } catch {
      toast.error("Failed to update priority.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Flag className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground">{t("priority")}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("priorityHint")}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("priorityHint")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Select value={current} onValueChange={change} disabled={saving}>
        <SelectTrigger size="sm" className="w-[140px]" aria-label={t("priority")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {t(`pr_${p}` as Key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
