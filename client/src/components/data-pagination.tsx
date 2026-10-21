import { Link, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DataPagination({
  page,
  totalPages,
  total,
  pageSize,
  className = "",
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  className?: string;
  onPageChange?: (page: number) => void;
}) {
  const [params] = useSearchParams();

  const href = (target: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `?${next.toString()}`;
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const showControls = total > pageSize;

  const navButton = (target: number, direction: "prev" | "next", enabled: boolean) => {
    const label = direction === "prev" ? "Previous page" : "Next page";
    const icon = direction === "prev" ? <ChevronLeft /> : <ChevronRight />;
    if (!enabled) {
      return (
        <Button type="button" variant="outline" size="icon" disabled aria-label={label}>
          {icon}
        </Button>
      );
    }
    if (onPageChange) {
      return (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          onClick={() => onPageChange(target)}
        >
          {icon}
        </Button>
      );
    }
    return (
      <Button asChild variant="outline" size="icon" aria-label={label}>
        <Link to={href(target)}>{icon}</Link>
      </Button>
    );
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground">
        {start}-{end} of {total}
      </span>
      {showControls && (
        <>
          {navButton(page - 1, "prev", page > 1)}
          {navButton(page + 1, "next", page < totalPages)}
        </>
      )}
    </div>
  );
}
