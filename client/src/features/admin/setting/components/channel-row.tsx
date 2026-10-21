import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/lib/I18n";

export default function ChannelRow({
  label,
  sms,
  email,
  onSms,
  onEmail,
  disabled,
}: {
  label: string;
  sms: boolean;
  email: boolean;
  onSms: (value: boolean) => void;
  onEmail: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useT();
  return (
    <div className="grid gap-2 border-t pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_120px_120px] sm:items-center">
      <p className="text-sm font-medium">{label}</p>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={sms}
          disabled={disabled}
          onCheckedChange={(value) => onSms(value === true)}
        />
        <span className="sm:hidden">{t("channelSms")}</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={email}
          disabled={disabled}
          onCheckedChange={(value) => onEmail(value === true)}
        />
        <span className="sm:hidden">{t("channelEmail")}</span>
      </label>
    </div>
  );
}
