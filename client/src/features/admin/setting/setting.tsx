import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
} from "react-router";
import {
  AlertCircle,
  BellRing,
  Building2,
  Clock,
  Image as ImageIcon,
  PenLine,
  Phone,
  Settings,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useT } from "@/lib/I18n";
import type { AdminLoaderData } from "@/layouts/admin/loader";
import type { SettingsActionResult } from "./action";
import type {
  BarangaySettings,
  SettingsChannels,
  SettingsLoaderData,
} from "./loader";

type Values = Omit<BarangaySettings, "id" | "updatedAt">;

function toValues(settings: BarangaySettings): Values {
  return {
    barangayName: settings.barangayName,
    city: settings.city,
    province: settings.province,
    address: settings.address,
    contactNumber: settings.contactNumber,
    email: settings.email,
    officeHours: settings.officeHours,
    punongBarangay: settings.punongBarangay,
    luponChairman: settings.luponChairman,
    logoUrl: settings.logoUrl,
    punongSignatureUrl: settings.punongSignatureUrl,
    luponSignatureUrl: settings.luponSignatureUrl,
    punongTitle: settings.punongTitle,
    luponTitle: settings.luponTitle,
    hotline: settings.hotline,
    tanodNumber: settings.tanodNumber,
    deadlineReceived: settings.deadlineReceived,
    deadlineSummoned: settings.deadlineSummoned,
    deadlineConciliation: settings.deadlineConciliation,
    riskWindowDays: settings.riskWindowDays,
    notifyStatusSms: settings.notifyStatusSms,
    notifyStatusEmail: settings.notifyStatusEmail,
    notifyMediationSms: settings.notifyMediationSms,
    notifyMediationEmail: settings.notifyMediationEmail,
    notifyCancelledSms: settings.notifyCancelledSms,
    notifyCancelledEmail: settings.notifyCancelledEmail,
  };
}

async function readError(err: unknown): Promise<string> {
  const response = (err as { response?: Response })?.response;
  if (response) {
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      return data.error ?? data.message ?? "Something went wrong.";
    } catch {
      /* fall through */
    }
  }
  return "Something went wrong.";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

function AssetUpload({
  label,
  hint,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  readOnly?: boolean;
}) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await api
        .post("settings/upload", { body })
        .json<{ url: string }>();
      onChange(result.url);
      toast.success(t("imageUploaded"));
    } catch (err) {
      toast.error(await readError(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              {uploading
                ? t("saving")
                : value
                  ? t("replaceImage")
                  : t("uploadImage")}
            </Button>
          )}
          {value && !readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
            >
              {t("removeImage")}
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}

function ChannelRow({
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

function LetterheadPreview({ values }: { values: Values }) {
  const { t } = useT();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("settingsPreview")}</CardTitle>
        <CardDescription>{t("settingsLetterhead")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-white p-4 text-center text-black">
          {values.logoUrl && (
            <img
              src={values.logoUrl}
              alt=""
              className="mx-auto mb-2 size-12 object-contain"
            />
          )}
          <p className="text-[10px] tracking-wide uppercase">{t("republic")}</p>
          <p className="text-[11px] font-semibold tracking-wide uppercase">
            {[values.province, values.city].filter(Boolean).join(" · ")}
          </p>
          <p className="text-sm font-bold tracking-wide uppercase">
            {values.barangayName || "—"}
          </p>
          <p className="mt-1 text-[10px] tracking-wide uppercase">
            {values.punongTitle || t("lblPunongBarangay")}
          </p>
        </div>

        <div className="mt-4 flex justify-between gap-3 text-center">
          <div className="flex-1">
            {values.punongSignatureUrl && (
              <img
                src={values.punongSignatureUrl}
                alt=""
                className="mx-auto h-8 object-contain"
              />
            )}
            <p className="text-xs font-semibold uppercase">
              {values.punongBarangay || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {values.punongTitle}
            </p>
          </div>
          <div className="flex-1">
            {values.luponSignatureUrl && (
              <img
                src={values.luponSignatureUrl}
                alt=""
                className="mx-auto h-8 object-contain"
              />
            )}
            <p className="text-xs font-semibold uppercase">
              {values.luponChairman || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {values.luponTitle}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChannelStatus({ channels }: { channels: SettingsChannels }) {
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

export default function BarangaySettingsPage() {
  const { t } = useT();
  const { settings, channels } = useLoaderData() as SettingsLoaderData;
  const { user } = useRouteLoaderData("admin") as AdminLoaderData;
  const actionData = useActionData() as SettingsActionResult | undefined;
  const submitting = useNavigation().state === "submitting";
  const canEdit = user.role === "admin";

  const [values, setValues] = useState<Values>(() => toValues(settings));
  const [baseline, setBaseline] = useState<Values>(() => toValues(settings));
  const handled = useRef<SettingsActionResult | undefined>(undefined);

  const fields = actionData?.fields ?? {};
  const isDirty = JSON.stringify(values) !== JSON.stringify(baseline);

  useEffect(() => {
    if (!actionData?.settings || handled.current === actionData) return;
    handled.current = actionData;
    const next = toValues(actionData.settings);
    setValues(next);
    setBaseline(next);
    toast.success(t("settingsSaved"));
  }, [actionData, t]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const updatedAt = actionData?.settings?.updatedAt ?? settings.updatedAt;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Settings className="size-7" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t("adminSettings")}</h1>
          <p className="text-sm text-muted-foreground">{t("settingsSub")}</p>
        </div>
      </div>

      <Form method="post">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <fieldset disabled={!canEdit} className="contents space-y-6">
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{actionData.error}</AlertTitle>
                <AlertDescription>
                  {Object.keys(fields).length > 0 && <p>{t("reviewFields")}</p>}
                </AlertDescription>
              </Alert>
            )}

            {/* Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
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
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="size-4 text-primary" />
                  {t("settingsContact")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <div className="space-y-2">
                  <Label htmlFor="officeHours" className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" />
                    {t("officeHours")}
                  </Label>
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
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="size-4 text-primary" />
                  {t("settingsBranding")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AssetUpload
                  label={t("logoLabel")}
                  hint={t("logoHint")}
                  value={values.logoUrl}
                  onChange={(url) => update("logoUrl", url)}
                  readOnly={!canEdit}
                />
              </CardContent>
            </Card>

            {/* Signatories */}
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

            {/* Deadlines */}
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

            {/* Notifications */}
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

            <input
              type="hidden"
              name="logoUrl"
              value={values.logoUrl}
              readOnly
            />
            <input
              type="hidden"
              name="punongSignatureUrl"
              value={values.punongSignatureUrl}
              readOnly
            />
            <input
              type="hidden"
              name="luponSignatureUrl"
              value={values.luponSignatureUrl}
              readOnly
            />
            {(
              [
                "notifyStatusSms",
                "notifyStatusEmail",
                "notifyMediationSms",
                "notifyMediationEmail",
                "notifyCancelledSms",
                "notifyCancelledEmail",
              ] as const
            ).map((key) => (
              <input
                key={key}
                type="hidden"
                name={key}
                value={values[key] ? "true" : "false"}
                readOnly
              />
            ))}
            </fieldset>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <LetterheadPreview values={values} />
            <ChannelStatus channels={channels} />
          </aside>
        </div>

        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-sm text-muted-foreground">
            {isDirty ? (
              t("unsavedChanges")
            ) : (
              <>
                {t("lastUpdated")}: {new Date(updatedAt).toLocaleString()}
              </>
            )}
          </p>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!isDirty || submitting}
                onClick={() => {
                  setValues(baseline);
                  toast.success(t("settingsReset"));
                }}
              >
                {t("resetChanges")}
              </Button>
              <Button type="submit" disabled={!isDirty || submitting}>
                {submitting ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("settingsViewOnly")}</p>
          )}
        </div>
      </Form>
    </div>
  );
}
