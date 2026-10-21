import { useEffect, useRef, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
} from "react-router";
import { AlertCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useT } from "@/lib/I18n";
import type { AdminLoaderData } from "@/layouts/admin/loader";
import type { SettingsActionResult } from "./action";
import type { SettingsLoaderData } from "./loader";
import BrandingSection from "./components/branding-section";
import ChannelStatus from "./components/channel-status";
import ContactSection from "./components/contact-section";
import DeadlinesSection from "./components/deadlines-section";
import IdentitySection from "./components/identity-section";
import LetterheadPreview from "./components/letterhead-preview";
import NotificationsSection from "./components/notifications-section";
import SaveBar from "./components/save-bar";
import SignatoriesSection from "./components/signatories-section";
import { toValues, type FieldErrors, type Values } from "./components/types";

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

  const fields: FieldErrors = actionData?.fields ?? {};
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

  function resetChanges() {
    setValues(baseline);
    toast.success(t("settingsReset"));
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

              <IdentitySection values={values} fields={fields} update={update} />
              <ContactSection values={values} fields={fields} update={update} />
              <BrandingSection values={values} update={update} canEdit={canEdit} />
              <SignatoriesSection
                values={values}
                fields={fields}
                update={update}
                canEdit={canEdit}
              />
              <DeadlinesSection values={values} fields={fields} update={update} />
              <NotificationsSection
                values={values}
                update={update}
                canEdit={canEdit}
              />

              <input type="hidden" name="logoUrl" value={values.logoUrl} readOnly />
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

        <SaveBar
          isDirty={isDirty}
          submitting={submitting}
          canEdit={canEdit}
          updatedAt={updatedAt}
          onReset={resetChanges}
        />
      </Form>
    </div>
  );
}
