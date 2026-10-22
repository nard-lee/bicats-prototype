import { useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/I18n";
import FieldError from "./field-error";
import type { SectionProps } from "./types";

export default function DeadlinesSection({
  values,
  fields,
  update,
}: SectionProps) {
  const { t, lang } = useT();
  const [holiday, setHoliday] = useState("");

  const formatHoliday = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(
      lang === "tl" ? "fil-PH" : "en-PH",
      { dateStyle: "medium" },
    );

  function addHoliday() {
    if (!holiday || values.holidays.includes(holiday)) return;
    update("holidays", [...values.holidays, holiday].sort());
    setHoliday("");
  }

  function removeHoliday(date: string) {
    update(
      "holidays",
      values.holidays.filter((entry) => entry !== date),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          {t("settingsDeadlines")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="deadlineReceived">
            {t("deadlineReceivedLabel")}
          </Label>
          <Input
            id="deadlineReceived"
            name="deadlineReceived"
            type="number"
            min={1}
            max={365}
            value={values.deadlineReceived}
            onChange={(e) =>
              update("deadlineReceived", Number(e.target.value))
            }
            className="h-11"
            aria-invalid={!!fields.deadlineReceived}
          />
          <FieldError message={fields.deadlineReceived} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadlineSummoned">
            {t("deadlineSummonedLabel")}
          </Label>
          <Input
            id="deadlineSummoned"
            name="deadlineSummoned"
            type="number"
            min={1}
            max={365}
            value={values.deadlineSummoned}
            onChange={(e) =>
              update("deadlineSummoned", Number(e.target.value))
            }
            className="h-11"
            aria-invalid={!!fields.deadlineSummoned}
          />
          <FieldError message={fields.deadlineSummoned} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadlineMediation">
            {t("deadlineMediationLabel")}
          </Label>
          <Input
            id="deadlineMediation"
            name="deadlineMediation"
            type="number"
            min={1}
            max={365}
            value={values.deadlineMediation}
            onChange={(e) =>
              update("deadlineMediation", Number(e.target.value))
            }
            className="h-11"
            aria-invalid={!!fields.deadlineMediation}
          />
          <FieldError message={fields.deadlineMediation} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadlineConciliation">
            {t("deadlineConciliationLabel")}
          </Label>
          <Input
            id="deadlineConciliation"
            name="deadlineConciliation"
            type="number"
            min={1}
            max={365}
            value={values.deadlineConciliation}
            onChange={(e) =>
              update("deadlineConciliation", Number(e.target.value))
            }
            className="h-11"
            aria-invalid={!!fields.deadlineConciliation}
          />
          <FieldError message={fields.deadlineConciliation} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="riskWindowDays">{t("riskWindowLabel")}</Label>
          <Input
            id="riskWindowDays"
            name="riskWindowDays"
            type="number"
            min={1}
            max={365}
            value={values.riskWindowDays}
            onChange={(e) =>
              update("riskWindowDays", Number(e.target.value))
            }
            className="h-11"
            aria-invalid={!!fields.riskWindowDays}
          />
          <FieldError message={fields.riskWindowDays} />
        </div>

        <div className="space-y-2 border-t pt-6 sm:col-span-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="workingDaysOnly"
              checked={values.workingDaysOnly}
              onCheckedChange={(checked) =>
                update("workingDaysOnly", checked === true)
              }
            />
            <Label htmlFor="workingDaysOnly">{t("workingDaysLabel")}</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("workingDaysHint")}
          </p>

          <div className="space-y-3 pt-2">
            <Label>{t("holidaysLabel")}</Label>
            {values.holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noHolidays")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {values.holidays.map((date) => (
                  <Badge key={date} variant="secondary" className="gap-1 pr-1">
                    {formatHoliday(date)}
                    <button
                      type="button"
                      onClick={() => removeHoliday(date)}
                      aria-label={`${t("removeHoliday")} ${formatHoliday(date)}`}
                      className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={holiday}
                onChange={(event) => setHoliday(event.target.value)}
                className="h-11 w-full sm:w-[200px]"
                aria-label={t("holidaysLabel")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addHoliday}
                disabled={!holiday}
              >
                <Plus className="mr-2 size-4" />
                {t("addHoliday")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("holidaysHint")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
