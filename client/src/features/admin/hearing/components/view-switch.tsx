import { cn } from "cn";
import { VIEWS, VIEW_LABEL, type HearingView } from "./constants";

type ViewSwitchProps = {
  activeView: HearingView;
  viewCounts: Record<HearingView, number>;
  onViewChange: (view: HearingView) => void;
};

export default function ViewSwitch({
  activeView,
  viewCounts,
  onViewChange,
}: ViewSwitchProps) {
  return (
    <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg bg-primary/5 p-1">
      {VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          aria-pressed={activeView === view}
          onClick={() => onViewChange(view)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeView === view
              ? "bg-background text-primary dark:text-status-ink"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {VIEW_LABEL[view]}
          <span
            className={cn(
              "text-sm tabular-nums",
              activeView === view
                ? "text-primary dark:text-status-ink"
                : "text-muted-foreground",
            )}
          >
            {viewCounts[view]}
          </span>
        </button>
      ))}
    </div>
  );
}
