import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/I18n";
import FieldError from "./field-error";
import Group from "./group";
import type { SectionProps } from "./types";

export default function ContactSection({
  values,
  fields,
  update,
}: SectionProps) {
  const { t } = useT();

  return (
    <Group title={t("settingsContact")}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactNumber">{t("contactNumber")}</Label>
          <Input
            id="contactNumber"
            name="contactNumber"
            type="tel"
            value={values.contactNumber}
            onChange={(e) => update("contactNumber", e.target.value)}
            maxLength={40}
            className="h-11"
            aria-invalid={!!fields.contactNumber}
          />
          <FieldError message={fields.contactNumber} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hotline">{t("hotlineLabel")}</Label>
          <Input
            id="hotline"
            name="hotline"
            type="tel"
            value={values.hotline}
            onChange={(e) => update("hotline", e.target.value)}
            maxLength={40}
            className="h-11"
            aria-invalid={!!fields.hotline}
          />
          <FieldError message={fields.hotline} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tanodNumber">{t("tanodLabel")}</Label>
          <Input
            id="tanodNumber"
            name="tanodNumber"
            type="tel"
            value={values.tanodNumber}
            onChange={(e) => update("tanodNumber", e.target.value)}
            maxLength={40}
            className="h-11"
            aria-invalid={!!fields.tanodNumber}
          />
          <FieldError message={fields.tanodNumber} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            maxLength={120}
            className="h-11"
            aria-invalid={!!fields.email}
          />
          <FieldError message={fields.email} />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Label htmlFor="officeHours">{t("officeHours")}</Label>
        <Textarea
          id="officeHours"
          name="officeHours"
          value={values.officeHours}
          onChange={(e) => update("officeHours", e.target.value)}
          maxLength={200}
          rows={2}
          aria-invalid={!!fields.officeHours}
        />
        <FieldError message={fields.officeHours} />
      </div>
    </Group>
  );
}
