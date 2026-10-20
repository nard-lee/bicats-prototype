import { api } from "@/lib/api";
import { getCurrentUser } from "@/hooks/use-auth";
import type { BarangaySettings } from "@/features/admin/setting/loader";

export type RootLoaderData = {
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  settings: BarangaySettings | null;
};

export async function RootLoader(): Promise<RootLoaderData> {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    api
      .get("settings")
      .json<BarangaySettings>()
      .catch(() => null),
  ]);

  return { user, settings };
}
