import { Image as ImageIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/I18n";
import AssetUpload from "./asset-upload";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" />
          {t("settingsBranding")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AssetUpload
          label={t("logoLabel")}
          hint={t("logoHint")}
          value={values.logoUrl}
          onChange={(url) => update("logoUrl", url)}
          readOnly={!canEdit}
        />
      </CardContent>
    </Card>
  );
}
