import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintStatus } from "../loader";
import { STATUSES } from "./statuses";

type BulkBarProps = {
  selectedCount: number;
  bulkStatus: ComplaintStatus;
  applying: boolean;
  onBulkStatusChange: (status: ComplaintStatus) => void;
  onApply: () => void;
  onExport: () => void;
  onClear: () => void;
};

export default function BulkBar({
  selectedCount,
  bulkStatus,
  applying,
  onBulkStatusChange,
  onApply,
  onExport,
  onClear,
}: BulkBarProps) {
  const { t } = useT();

  if (selectedCount === 0) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
      <span className="text-sm font-medium tabular-nums">
        {selectedCount} {t("clSelected")}
      </span>

      <Select
        value={bulkStatus}
        onValueChange={(value) => onBulkStatusChange(value as ComplaintStatus)}
      >
        <SelectTrigger size="sm" className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`st_${s}` as Key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button size="sm" onClick={onApply} disabled={applying}>
        {applying ? t("clApplying") : t("clApplyStatus")}
      </Button>

      <Button size="sm" variant="outline" onClick={onExport}>
        <FileDown className="mr-2 h-4 w-4" />
        {t("anExportCsv")}
      </Button>

      <Button size="sm" variant="ghost" onClick={onClear}>
        {t("clClear")}
      </Button>
    </div>
  );
}
