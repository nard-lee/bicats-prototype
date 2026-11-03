import { HTTPError } from "ky";
import { api } from "@/lib/api";
import { applyTheme } from "@/lib/theme";
import type { CurrentUser } from "@/hooks/use-auth";
import type { BarangaySettings } from "@/features/admin/setting/loader";

export type Bootstrap = {
  user: CurrentUser | null;
  settings: BarangaySettings | null;
};

let bootstrapPromise: Promise<Bootstrap> | null = null;

async function fetchBootstrap(): Promise<Bootstrap> {
  try {
    const data = await api.get("auth/bootstrap").json<Bootstrap>();
    applyTheme(data.settings?.theme);
    return data;
  } catch (err) {
    if (err instanceof HTTPError && err.response.status === 401) {
      // A remembered session failed to refresh; the signed-out page still needs
      // the barangay profile for the header and letterhead.
      const settings = await api
        .get("settings")
        .json<BarangaySettings>()
        .catch(() => null);
      applyTheme(settings?.theme);
      return { user: null, settings };
    }
    throw err;
  }
}

export function getBootstrap(): Promise<Bootstrap> {
  if (!bootstrapPromise) {
    bootstrapPromise = fetchBootstrap().catch((err) => {
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}

export function clearBootstrap(): void {
  bootstrapPromise = null;
}
