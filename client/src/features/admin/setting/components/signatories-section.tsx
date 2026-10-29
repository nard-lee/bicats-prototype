import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/I18n";
import AssetUpload from "./asset-upload";
import FieldError from "./field-error";
import type { EditableSectionProps } from "./types";

export default function SignatoriesSection({
  values,
  fields,
  update,
  canEdit,
}: EditableSectionProps) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("settingsSignatories")}
        </CardTitle>
        <CardDescription>{t("settingsSignatoriesDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="punongBarangay">{t("punongBarangay")}</Label>
            <Input
              id="punongBarangay"
              name="punongBarangay"
              value={values.punongBarangay}
              onChange={(e) => update("punongBarangay", e.target.value)}
              maxLength={120}
              className="h-11"
              aria-invalid={!!fields.punongBarangay}
            />
            <FieldError message={fields.punongBarangay} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="punongTitle">{t("punongTitleLabel")}</Label>
            <Input
              id="punongTitle"
              name="punongTitle"
              value={values.punongTitle}
              onChange={(e) => update("punongTitle", e.target.value)}
              maxLength={120}
              className="h-11"
              aria-invalid={!!fields.punongTitle}
            />
            <FieldError message={fields.punongTitle} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretaryName">{t("secretaryName")}</Label>
            <Input
              id="secretaryName"
              name="secretaryName"
              value={values.secretaryName}
              onChange={(e) => update("secretaryName", e.target.value)}
              maxLength={120}
              className="h-11"
              aria-invalid={!!fields.secretaryName}
            />
            <FieldError message={fields.secretaryName} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretaryTitle">{t("secretaryTitleLabel")}</Label>
            <Input
              id="secretaryTitle"
              name="secretaryTitle"
              value={values.secretaryTitle}
              onChange={(e) => update("secretaryTitle", e.target.value)}
              maxLength={120}
              className="h-11"
              aria-invalid={!!fields.secretaryTitle}
            />
            <FieldError message={fields.secretaryTitle} />
          </div>
        </div>

        <div className="grid gap-6 border-t pt-6 sm:grid-cols-2">
          <AssetUpload
            label={`${t("punongBarangay")} — ${t("signatureLabel")}`}
            value={values.punongSignatureUrl}
            onChange={(url) => update("punongSignatureUrl", url)}
            readOnly={!canEdit}
          />
          <AssetUpload
            label={`${t("secretaryName")} — ${t("signatureLabel")}`}
            value={values.secretarySignatureUrl}
            onChange={(url) => update("secretarySignatureUrl", url)}
            readOnly={!canEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
}
