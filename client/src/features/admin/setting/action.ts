import { HTTPError } from "ky";
import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import type { BarangaySettings } from "./loader";

export type SettingsActionResult = {
  success?: boolean;
  error?: string;
  fields?: Record<string, string>;
  settings?: BarangaySettings;
};

const TEXT_FIELDS = [
  "barangayName",
  "city",
  "province",
  "address",
  "contactNumber",
  "email",
  "officeHours",
  "punongBarangay",
  "luponChairman",
  "logoUrl",
  "punongSignatureUrl",
  "luponSignatureUrl",
  "punongTitle",
  "luponTitle",
  "hotline",
  "tanodNumber",
] as const;

const NUMBER_FIELDS = [
  "deadlineReceived",
  "deadlineSummoned",
  "deadlineConciliation",
  "riskWindowDays",
] as const;

const BOOLEAN_FIELDS = [
  "notifyStatusSms",
  "notifyStatusEmail",
  "notifyMediationSms",
  "notifyMediationEmail",
  "notifyCancelledSms",
  "notifyCancelledEmail",
] as const;

export async function settingsAction({
  request,
}: ActionFunctionArgs): Promise<SettingsActionResult> {
  const form = await request.formData();

  const payload: Record<string, string | number | boolean> = {};
  for (const key of TEXT_FIELDS) payload[key] = String(form.get(key) ?? "");
  for (const key of NUMBER_FIELDS) payload[key] = Number(form.get(key) ?? 0);
  for (const key of BOOLEAN_FIELDS) payload[key] = form.get(key) === "true";

  try {
    const settings = await api
      .patch("settings", { json: payload })
      .json<BarangaySettings>();
    return { success: true, settings };
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
