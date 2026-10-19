import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <Select value={current} onValueChange={change} disabled={saving}>
      <SelectTrigger size="sm" className="w-[150px]">
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
  );
}
