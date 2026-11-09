import { LayoutGrid, List } from "lucide-react";
import { cn } from "cn";
import { LAYOUTS, LAYOUT_LABEL, type HearingLayout } from "./constants";

const ICON: Record<HearingLayout, typeof LayoutGrid> = {
  grid: LayoutGrid,
  list: List,
};

type LayoutSwitchProps = {
  activeLayout: HearingLayout;
  onLayoutChange: (layout: HearingLayout) => void;
};

export default function LayoutSwitch({
  activeLayout,
  onLayoutChange,
}: LayoutSwitchProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-primary/5 p-1">
      {LAYOUTS.map((layout) => {
        const Icon = ICON[layout];
        return (
          <button
            key={layout}
            type="button"
            aria-pressed={activeLayout === layout}
            aria-label={LAYOUT_LABEL[layout]}
            title={LAYOUT_LABEL[layout]}
            onClick={() => onLayoutChange(layout)}
            className={cn(
              "inline-flex rounded-md p-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeLayout === layout
                ? "bg-background text-primary dark:text-status-ink"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
