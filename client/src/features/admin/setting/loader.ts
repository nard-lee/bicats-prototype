import { api } from "@/lib/api";

export type BarangaySettings = {
  id: number;
  barangayName: string;
  city: string;
  province: string;
  address: string;
  contactNumber: string;
  email: string;
  officeHours: string;
  punongBarangay: string;
  luponChairman: string;
  logoUrl: string;
  punongSignatureUrl: string;
  luponSignatureUrl: string;
  punongTitle: string;
  luponTitle: string;
  puroks: string[];
  documentOfficeLine: string;
  hotline: string;
  tanodNumber: string;
  defaultHearingLocation: string;
  hearingDurationMinutes: number;
  officeStartHour: number;
  officeEndHour: number;
  enforceOfficeHours: boolean;
  hearingGraceHours: number;
  deadlineReceived: number;
  deadlineSummoned: number;
  deadlineMediation: number;
  deadlineConciliation: number;
  riskWindowDays: number;
  workingDaysOnly: boolean;
  holidays: string[];
  notifyStatusSms: boolean;
  notifyStatusEmail: boolean;
  notifyMediationSms: boolean;
  notifyMediationEmail: boolean;
  notifyCancelledSms: boolean;
  notifyCancelledEmail: boolean;
  reminderLeadHours: number;
  updatedAt: string;
};

export type SettingsChannels = {
  sms: boolean;
  email: boolean;
};

export type SettingsLoaderData = {
  settings: BarangaySettings;
  channels: SettingsChannels;
};

export async function SettingsLoader(): Promise<SettingsLoaderData> {
  const [settings, channels] = await Promise.all([
    api.get("settings").json<BarangaySettings>(),
    api.get("settings/channels").json<SettingsChannels>(),
  ]);

  return { settings, channels };
}
