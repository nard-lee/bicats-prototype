import { Button } from "@/components/ui/button";
import { useT } from "@/lib/I18n";

export default function SaveBar({
  isDirty,
  submitting,
  canEdit,
  updatedAt,
  onReset,
}: {
  isDirty: boolean;
  submitting: boolean;
  canEdit: boolean;
  updatedAt: string;
  onReset: () => void;
}) {
  const { t } = useT();

  return (
    <div
      data-save-bar
      className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6"
    >
      <p className="text-sm text-muted-foreground">
        {isDirty ? (
          t("unsavedChanges")
        ) : (
          <>
            {t("lastUpdated")}: {new Date(updatedAt).toLocaleString()}
          </>
        )}
      </p>
      {canEdit ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || submitting}
            onClick={onReset}
          >
            {t("resetChanges")}
          </Button>
          <Button type="submit" disabled={!isDirty || submitting}>
            {submitting ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("settingsViewOnly")}</p>
      )}
    </div>
  );
}
