import { Link, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DataPagination({
  page,
  totalPages,
  total,
  pageSize,
  className = "",
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  className?: string;
}) {
  const [params] = useSearchParams();

  const href = (target: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `?${next.toString()}`;
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground">
        {start}-{end} of {total}
      </span>
      {page > 1 ? (
        <Button asChild variant="outline" size="icon" aria-label="Previous page">
          <Link to={href(page - 1)}>
            <ChevronLeft />
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
      )}
      {page < totalPages ? (
        <Button asChild variant="outline" size="icon" aria-label="Next page">
          <Link to={href(page + 1)}>
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      )}
    </div>
  );
}
