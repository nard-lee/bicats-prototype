import { PenLine } from "lucide-react";
import {
  Card,
  CardContent,
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
        <CardTitle className="flex items-center gap-2">
          <PenLine className="size-4 text-primary" />
          {t("settingsSignatories")}
        </CardTitle>
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
            <Label htmlFor="luponChairman">{t("luponChairman")}</Label>
            <Input
              id="luponChairman"
              name="luponChairman"
              value={values.luponChairman}
              onChange={(e) => update("luponChairman", e.target.value)}
              maxLength={120}
              className="h-11"
              aria-invalid={!!fields.luponChairman}
            />
            <FieldError message={fields.luponChairman} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="luponTitle">{t("luponTitleLabel")}</Label>
            <Input
              id="luponTitle"
              name="luponTitle"
              value={values.luponTitle}
              onChange={(e) => update("luponTitle", e.target.value)}
              maxLength={120}
              className="h-11"
              aria-invalid={!!fields.luponTitle}
            />
            <FieldError message={fields.luponTitle} />
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
            label={`${t("luponChairman")} — ${t("signatureLabel")}`}
            value={values.luponSignatureUrl}
            onChange={(url) => update("luponSignatureUrl", url)}
            readOnly={!canEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
}
