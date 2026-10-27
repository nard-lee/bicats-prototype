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
    secretaryName: settings.secretaryName,
    logoUrl: settings.logoUrl,
    punongSignatureUrl: settings.punongSignatureUrl,
    secretarySignatureUrl: settings.secretarySignatureUrl,
    punongTitle: settings.punongTitle,
    secretaryTitle: settings.secretaryTitle,
    puroks: settings.puroks,
    documentOfficeLine: settings.documentOfficeLine,
    hotline: settings.hotline,
    tanodNumber: settings.tanodNumber,
    defaultHearingLocation: settings.defaultHearingLocation,
    hearingDurationMinutes: settings.hearingDurationMinutes,
    officeStartHour: settings.officeStartHour,
    officeEndHour: settings.officeEndHour,
    enforceOfficeHours: settings.enforceOfficeHours,
    hearingGraceHours: settings.hearingGraceHours,
    deadlineReceived: settings.deadlineReceived,
    deadlineSummoned: settings.deadlineSummoned,
    deadlineMediation: settings.deadlineMediation,
    deadlineConciliation: settings.deadlineConciliation,
    riskWindowDays: settings.riskWindowDays,
    workingDaysOnly: settings.workingDaysOnly,
    holidays: settings.holidays,
    notifyIntakeSms: settings.notifyIntakeSms,
    notifyIntakeEmail: settings.notifyIntakeEmail,
    notifyStatusSms: settings.notifyStatusSms,
    notifyStatusEmail: settings.notifyStatusEmail,
    notifyMediationSms: settings.notifyMediationSms,
    notifyMediationEmail: settings.notifyMediationEmail,
    notifyCancelledSms: settings.notifyCancelledSms,
    notifyCancelledEmail: settings.notifyCancelledEmail,
    reminderLeadHours: settings.reminderLeadHours,
  };
}
