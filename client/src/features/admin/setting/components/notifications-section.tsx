import { BellRing } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/I18n";
import ChannelRow from "./channel-row";
import type { Update, Values } from "./types";

export default function NotificationsSection({
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
      </CardContent>
    </Card>
  );
}
