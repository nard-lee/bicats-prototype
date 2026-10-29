import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/I18n";
import FieldError from "./field-error";
import type { SectionProps } from "./types";

export default function IdentitySection({
  values,
  fields,
  update,
}: SectionProps) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("settingsIdentity")}
        </CardTitle>
        <CardDescription>{t("settingsLetterhead")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="barangayName">{t("barangayName")}</Label>
            <Input
              id="barangayName"
              name="barangayName"
              value={values.barangayName}
              onChange={(e) => update("barangayName", e.target.value)}
              maxLength={120}
              className="h-11"
              aria-invalid={!!fields.barangayName}
              required
            />
            <FieldError message={fields.barangayName} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{t("cityLabel")}</Label>
            <Input
              id="city"
              name="city"
              value={values.city}
              onChange={(e) => update("city", e.target.value)}
              maxLength={120}
              className="h-11"
              aria-invalid={!!fields.city}
              required
            />
            <FieldError message={fields.city} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">{t("province")}</Label>
          <Input
            id="province"
            name="province"
            value={values.province}
            onChange={(e) => update("province", e.target.value)}
            maxLength={120}
            className="h-11"
            aria-invalid={!!fields.province}
          />
          <FieldError message={fields.province} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t("address")}</Label>
          <Textarea
            id="address"
            name="address"
            value={values.address}
            onChange={(e) => update("address", e.target.value)}
            maxLength={200}
            rows={3}
            aria-invalid={!!fields.address}
          />
          <FieldError message={fields.address} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentOfficeLine">
            {t("officeLineLabel")}
          </Label>
          <Input
            id="documentOfficeLine"
            name="documentOfficeLine"
            value={values.documentOfficeLine}
            onChange={(e) => update("documentOfficeLine", e.target.value)}
            maxLength={120}
            className="h-11"
            aria-invalid={!!fields.documentOfficeLine}
          />
          <FieldError message={fields.documentOfficeLine} />
          <p className="text-sm text-muted-foreground">
            {t("officeLineHint")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
