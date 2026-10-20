import { redirect } from "react-router";
import { getCurrentUser, type CurrentUser } from "@/hooks/use-auth";
import { INTERNAL_ROLES } from "@/lib/roles";
import { api } from "@/lib/api";
import type { BarangaySettings } from "@/features/admin/setting/loader";

export type AdminLoaderData = {
  user: CurrentUser;
  settings: BarangaySettings;
};

export async function AdminLoader(): Promise<AdminLoaderData> {
  const user = await getCurrentUser();
  if (!user) throw redirect("/login");
  if (!(INTERNAL_ROLES as string[]).includes(user.role)) throw redirect("/");

  const settings = await api.get("settings").json<BarangaySettings>();

  return { user, settings };
}

export async function AdminOnlyLoader() {
  const user = await getCurrentUser();
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/admin");
  return null;
}
