import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Printer } from "lucide-react";
import { useT } from "@/lib/I18n";
import type { ScopeGroup } from "./types";

type ScopeControlsProps = {
  value: string;
  onValueChange: (value: string) => void;
  groups: ScopeGroup[];
  onExport: () => void;
};

export default function ScopeControls({
  value,
  onValueChange,
  groups,
  onExport,
}: ScopeControlsProps) {
  const { t } = useT();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[200px]" aria-label={t("anScope")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onExport}>
        <FileDown className="mr-2 h-4 w-4" />
        {t("anExportCsv")}
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        {t("anPrint")}
      </Button>
    </div>
  );
}
