import { Link } from "react-router";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/I18n";

type EmptyStateProps = {
  hasFilters: boolean;
};

export default function EmptyState({ hasFilters }: EmptyStateProps) {
  const { t } = useT();

  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ClipboardList className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">
        {hasFilters ? t("clNoMatches") : t("clNoComplaints")}
      </p>
      {hasFilters && (
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/complaints">{t("clClear")}</Link>
        </Button>
      )}
    </div>
  );
}
