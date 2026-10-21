import type { SettingsActionResult } from "../action";
import type { BarangaySettings } from "../loader";

export type Values = Omit<BarangaySettings, "id" | "updatedAt">;

export type FieldErrors = NonNullable<SettingsActionResult["fields"]>;

export type Update = <K extends keyof Values>(
  key: K,
  value: Values[K],
) => void;

export type SectionProps = {
  values: Values;
  fields: FieldErrors;
  update: Update;
};

export type EditableSectionProps = SectionProps & {
  canEdit: boolean;
};

export function toValues(settings: BarangaySettings): Values {
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
    deadlineMediation: settings.deadlineMediation,
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
