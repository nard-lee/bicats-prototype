import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/I18n";
import type { SettingsChannels } from "../loader";

export default function ChannelStatus({
  channels,
}: {
  channels: SettingsChannels;
}) {
  const { t } = useT();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("settingsChannels")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${channels.sms ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
          />
          <p className={channels.sms ? "" : "text-muted-foreground"}>
            {channels.sms ? t("smsConfigured") : t("smsMissing")}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${channels.email ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
          />
          <p className={channels.email ? "" : "text-muted-foreground"}>
            {channels.email ? t("emailConfigured") : t("emailMissing")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
