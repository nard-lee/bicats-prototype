import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const { t } = useT();

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
      </CardContent>
    </Card>
  );
}
