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
  hotline: string;
  tanodNumber: string;
  deadlineReceived: number;
  deadlineSummoned: number;
  deadlineConciliation: number;
  riskWindowDays: number;
  notifyStatusSms: boolean;
  notifyStatusEmail: boolean;
  notifyMediationSms: boolean;
  notifyMediationEmail: boolean;
  notifyCancelledSms: boolean;
  notifyCancelledEmail: boolean;
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
