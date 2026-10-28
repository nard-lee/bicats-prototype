import { useEffect, useRef, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
} from "react-router";
import {
  AlertCircle,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  PenLine,
  Settings,
  UsersRound,
} from "lucide-react";
import { cn } from "cn";
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
import LuponSection from "./components/lupon-section";
import NotificationsSection from "./components/notifications-section";
import PuroksSection from "./components/puroks-section";
import SaveBar from "./components/save-bar";
import SchedulingSection from "./components/scheduling-section";
import SignatoriesSection from "./components/signatories-section";
import { toValues, type FieldErrors, type Values } from "./components/types";

const SECTIONS = [
  { id: "profile", icon: Building2, label: "barangayProfile" },
  { id: "signatories", icon: PenLine, label: "settingsSignatories" },
  { id: "lupon", icon: UsersRound, label: "luponSectionTitle" },
  { id: "deadlines", icon: CalendarClock, label: "settingsNavDeadlines" },
  { id: "scheduling", icon: CalendarDays, label: "settingsScheduling" },
  { id: "notifications", icon: Bell, label: "settingsNavNotifications" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function sectionFromHash(hash: string): SectionId | undefined {
  const id = hash.replace(/^#/, "");
  return SECTIONS.find((section) => section.id === id)?.id;
}

// Which tab owns each server field, so a rejected save lands on the tab that
// holds the highlighted input.
const FIELD_SECTIONS: Record<string, SectionId> = {
  barangayName: "profile",
  city: "profile",
  province: "profile",
  address: "profile",
  documentOfficeLine: "profile",
  contactNumber: "profile",
  hotline: "profile",
  tanodNumber: "profile",
  email: "profile",
  officeHours: "profile",
  puroks: "profile",
  logoUrl: "profile",
  punongBarangay: "signatories",
  secretaryName: "signatories",
  punongTitle: "signatories",
  secretaryTitle: "signatories",
  punongSignatureUrl: "signatories",
  secretarySignatureUrl: "signatories",
  deadlineReceived: "deadlines",
  deadlineSummoned: "deadlines",
  deadlineMediation: "deadlines",
  deadlineConciliation: "deadlines",
  riskWindowDays: "deadlines",
  workingDaysOnly: "deadlines",
  holidays: "deadlines",
  defaultHearingLocation: "scheduling",
  hearingDurationMinutes: "scheduling",
  officeStartHour: "scheduling",
  officeEndHour: "scheduling",
  enforceOfficeHours: "scheduling",
  hearingGraceHours: "scheduling",
  reminderLeadHours: "notifications",
  notifyIntakeSms: "notifications",
  notifyIntakeEmail: "notifications",
  notifyStatusSms: "notifications",
  notifyStatusEmail: "notifications",
  notifyMediationSms: "notifications",
  notifyMediationEmail: "notifications",
  notifyCancelledSms: "notifications",
  notifyCancelledEmail: "notifications",
};

function sectionOfFields(
  fields: Record<string, string> | undefined,
): SectionId | undefined {
  if (!fields) return undefined;
  return Object.keys(fields)
    .map((key) => FIELD_SECTIONS[key])
    .find((value): value is SectionId => value !== undefined);
}

export default function BarangaySettingsPage() {
  const { t } = useT();
  const { settings, channels } = useLoaderData() as SettingsLoaderData;
  const { user } = useRouteLoaderData("admin") as AdminLoaderData;
  const actionData = useActionData() as SettingsActionResult | undefined;
  const submitting = useNavigation().state === "submitting";
  const canEdit = user.role === "admin";

  // A rejected save jumps to the tab holding the highlighted field, unless the
  // user has already picked a tab since that response arrived.
  const [nav, setNav] = useState<{
    section: SectionId;
    action: SettingsActionResult | undefined;
  }>({
    section: sectionFromHash(window.location.hash) ?? "profile",
    action: undefined,
  });
  const active =
    (nav.action === actionData ? undefined : sectionOfFields(actionData?.fields)) ??
    nav.section;
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

      <Form method="post" noValidate>
        <div className="grid items-start gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav
            aria-label={t("settingsSections")}
            className="min-w-0 lg:sticky lg:top-6"
          >
            <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setNav({ section: id, action: actionData });
                    window.history.replaceState(null, "", `#${id}`);
                  }}
                  aria-current={active === id ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                    active === id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {t(label)}
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0 space-y-6">
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{actionData.error}</AlertTitle>
                <AlertDescription>
                  {Object.keys(fields).length > 0 && <p>{t("reviewFields")}</p>}
                </AlertDescription>
              </Alert>
            )}

            <fieldset disabled={!canEdit} className="contents">
              <section hidden={active !== "profile"} className="space-y-6">
                <IdentitySection values={values} fields={fields} update={update} />
                <ContactSection values={values} fields={fields} update={update} />
                <PuroksSection values={values} fields={fields} update={update} />
                <BrandingSection values={values} update={update} canEdit={canEdit} />
              </section>

              <section hidden={active !== "signatories"}>
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <SignatoriesSection
                    values={values}
                    fields={fields}
                    update={update}
                    canEdit={canEdit}
                  />
                  <div className="xl:sticky xl:top-6">
                    <LetterheadPreview values={values} />
                  </div>
                </div>
              </section>

              <section hidden={active !== "lupon"} className="space-y-6">
                <LuponSection canEdit={canEdit} />
              </section>

              <section hidden={active !== "deadlines"} className="space-y-6">
                <DeadlinesSection values={values} fields={fields} update={update} />
              </section>

              <section hidden={active !== "scheduling"} className="space-y-6">
                <SchedulingSection values={values} fields={fields} update={update} />
              </section>

              <section hidden={active !== "notifications"}>
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <NotificationsSection
                    values={values}
                    fields={fields}
                    update={update}
                    canEdit={canEdit}
                  />
                  <ChannelStatus channels={channels} />
                </div>
              </section>

              <input type="hidden" name="logoUrl" value={values.logoUrl} readOnly />
              <input
                type="hidden"
                name="punongSignatureUrl"
                value={values.punongSignatureUrl}
                readOnly
              />
              <input
                type="hidden"
                name="secretarySignatureUrl"
                value={values.secretarySignatureUrl}
                readOnly
              />
              <input
                type="hidden"
                name="holidays"
                value={JSON.stringify(values.holidays)}
                readOnly
              />
              <input
                type="hidden"
                name="puroks"
                value={JSON.stringify(values.puroks)}
                readOnly
              />
              {(
                [
                  "enforceOfficeHours",
                  "workingDaysOnly",
                  "notifyIntakeSms",
                  "notifyIntakeEmail",
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
