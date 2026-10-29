import { useT } from "@/lib/I18n";
import AssetUpload from "./asset-upload";
import Group from "./group";
import type { Update, Values } from "./types";

export default function BrandingSection({
  values,
  update,
  canEdit,
}: {
  values: Values;
  update: Update;
  canEdit: boolean;
}) {
  const { t } = useT();

  return (
    <Group title={t("settingsBranding")}>
      <AssetUpload
        label={t("logoLabel")}
        hint={t("logoHint")}
        value={values.logoUrl}
        onChange={(url) => update("logoUrl", url)}
        readOnly={!canEdit}
      />
    </Group>
  );
}
