import { HTTPError } from "ky";
import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";

export type SettingsActionResult = {
  success?: boolean;
  error?: string;
  fields?: Record<string, string>;
};

const str = (form: FormData, key: string) => String(form.get(key) ?? "");

const FIELDS = [
  "barangayName",
  "city",
  "province",
  "address",
  "contactNumber",
  "email",
  "officeHours",
  "punongBarangay",
  "luponChairman",
] as const;

export async function settingsAction({
  request,
}: ActionFunctionArgs): Promise<SettingsActionResult> {
  const form = await request.formData();

  const payload: Record<string, string> = {};
  for (const key of FIELDS) payload[key] = str(form, key);

  try {
    await api.patch("settings", { json: payload });
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof HTTPError) {
      const body = err.data as
        | { error?: string; fields?: Record<string, string> }
        | undefined;
      return {
        error: body?.error ?? `Update failed (${err.response.status})`,
        fields: body?.fields,
      };
    }

    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
