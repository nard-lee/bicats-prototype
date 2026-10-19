import { api } from "@/lib/api";
import { AdminOnlyLoader } from "@/layouts/admin/loader";

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
  updatedAt: string;
};

export async function SettingsLoader() {
  await AdminOnlyLoader();
  return api.get("settings").json<BarangaySettings>();
}
