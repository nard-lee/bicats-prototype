import { CalendarClock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/I18n";
import FieldError from "./field-error";
import type { SectionProps } from "./types";

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const START_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const END_HOURS = Array.from({ length: 24 }, (_, index) => index + 1);

export default function SchedulingSection({
  values,
  fields,
  update,
}: SectionProps) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          {t("settingsScheduling")}
        </CardTitle>
        <CardDescription>{t("settingsSchedulingHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="defaultHearingLocation">
              {t("defaultVenueLabel")}
            </Label>
            <Input
              id="defaultHearingLocation"
              name="defaultHearingLocation"
              value={values.defaultHearingLocation}
              onChange={(e) =>
                update("defaultHearingLocation", e.target.value)
              }
              placeholder={t("defaultVenuePlaceholder")}
              maxLength={200}
              className="h-11"
              aria-invalid={!!fields.defaultHearingLocation}
            />
            <FieldError message={fields.defaultHearingLocation} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hearingDurationMinutes">
              {t("sessionLengthLabel")}
            </Label>
            <Input
              id="hearingDurationMinutes"
              name="hearingDurationMinutes"
              type="number"
              min={15}
              max={480}
              step={15}
              value={values.hearingDurationMinutes}
              onChange={(e) =>
                update("hearingDurationMinutes", Number(e.target.value))
              }
              className="h-11"
              aria-invalid={!!fields.hearingDurationMinutes}
            />
            <p className="text-sm text-muted-foreground">
              {t("sessionLengthHint")}
            </p>
            <FieldError message={fields.hearingDurationMinutes} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hearingGraceHours">
              {t("hearingGraceLabel")}
            </Label>
            <Input
              id="hearingGraceHours"
              name="hearingGraceHours"
              type="number"
              min={0}
              max={24}
              value={values.hearingGraceHours}
              onChange={(e) =>
                update("hearingGraceHours", Number(e.target.value))
              }
              className="h-11"
              aria-invalid={!!fields.hearingGraceHours}
            />
            <p className="text-sm text-muted-foreground">
              {t("hearingGraceHint")}
            </p>
            <FieldError message={fields.hearingGraceHours} />
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="enforceOfficeHours"
              checked={values.enforceOfficeHours}
              onCheckedChange={(checked) =>
                update("enforceOfficeHours", checked === true)
              }
            />
            <Label htmlFor="enforceOfficeHours">
              {t("enforceOfficeHoursLabel")}
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("enforceOfficeHoursHint")}
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="officeStartHour">{t("officeOpensLabel")}</Label>
              <Select
                value={String(values.officeStartHour)}
                onValueChange={(value) =>
                  update("officeStartHour", Number(value))
                }
              >
                <SelectTrigger id="officeStartHour" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {START_HOURS.map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {hourLabel(hour)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fields.officeStartHour} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="officeEndHour">{t("officeClosesLabel")}</Label>
              <Select
                value={String(values.officeEndHour)}
                onValueChange={(value) =>
                  update("officeEndHour", Number(value))
                }
              >
                <SelectTrigger id="officeEndHour" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {END_HOURS.map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {hourLabel(hour)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fields.officeEndHour} />
            </div>
          </div>

          <input
            type="hidden"
            name="officeStartHour"
            value={values.officeStartHour}
            readOnly
          />
          <input
            type="hidden"
            name="officeEndHour"
            value={values.officeEndHour}
            readOnly
          />
        </div>
      </CardContent>
    </Card>
  );
}
