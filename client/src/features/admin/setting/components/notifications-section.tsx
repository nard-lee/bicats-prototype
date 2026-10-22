import { BellRing } from "lucide-react";
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
import ChannelRow from "./channel-row";
import FieldError from "./field-error";
import type { FieldErrors, Update, Values } from "./types";

export default function NotificationsSection({
  values,
  fields,
  update,
  canEdit,
}: {
  values: Values;
  fields: FieldErrors;
  update: Update;
  canEdit: boolean;
}) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4 text-primary" />
          {t("settingsNotifications")}
        </CardTitle>
        <CardDescription>{t("notificationsHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid-cols-[minmax(0,1fr)_120px_120px]">
          <span />
          <span>{t("channelSms")}</span>
          <span>{t("channelEmail")}</span>
        </div>

        <ChannelRow
          label={t("notifyStatusEvent")}
          sms={values.notifyStatusSms}
          email={values.notifyStatusEmail}
          onSms={(value) => update("notifyStatusSms", value)}
          onEmail={(value) => update("notifyStatusEmail", value)}
          disabled={!canEdit}
        />
        <ChannelRow
          label={t("notifyMediationEvent")}
          sms={values.notifyMediationSms}
          email={values.notifyMediationEmail}
          onSms={(value) => update("notifyMediationSms", value)}
          onEmail={(value) => update("notifyMediationEmail", value)}
          disabled={!canEdit}
        />
        <ChannelRow
          label={t("notifyCancelledEvent")}
          sms={values.notifyCancelledSms}
          email={values.notifyCancelledEmail}
          onSms={(value) => update("notifyCancelledSms", value)}
          onEmail={(value) => update("notifyCancelledEmail", value)}
          disabled={!canEdit}
        />

        <div className="space-y-2 border-t pt-4 sm:max-w-xs">
          <Label htmlFor="reminderLeadHours">
            {t("reminderLeadLabel")}
          </Label>
          <Input
            id="reminderLeadHours"
            name="reminderLeadHours"
            type="number"
            min={1}
            max={168}
            value={values.reminderLeadHours}
            onChange={(event) =>
              update("reminderLeadHours", Number(event.target.value))
            }
            className="h-11"
            aria-invalid={!!fields.reminderLeadHours}
          />
          <p className="text-xs text-muted-foreground">
            {t("reminderLeadHint")}
          </p>
          <FieldError message={fields.reminderLeadHours} />
        </div>
      </CardContent>
    </Card>
  );
}
