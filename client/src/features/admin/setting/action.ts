import { HTTPError } from "ky";
import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import { clearBootstrap } from "@/lib/bootstrap";
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
  "secretaryName",
  "logoUrl",
  "punongSignatureUrl",
  "secretarySignatureUrl",
  "punongTitle",
  "secretaryTitle",
  "documentOfficeLine",
  "hotline",
  "tanodNumber",
  "defaultHearingLocation",
] as const;

const NUMBER_FIELDS = [
  "hearingDurationMinutes",
  "officeStartHour",
  "officeEndHour",
  "hearingGraceHours",
  "deadlineReceived",
  "deadlineSummoned",
  "deadlineMediation",
  "deadlineConciliation",
  "riskWindowDays",
  "reminderLeadHours",
] as const;

const BOOLEAN_FIELDS = [
  "enforceOfficeHours",
  "workingDaysOnly",
  "notifyIntakeSms",
  "notifyIntakeEmail",
  "notifyStatusSms",
  "notifyStatusEmail",
  "notifyMediationSms",
  "notifyMediationEmail",
  "notifyCancelledSms",
  "notifyCancelledEmail",
] as const;

function parseList(value: FormDataEntryValue | null): string[] {
  try {
    const parsed: unknown = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

export async function settingsAction({
  request,
}: ActionFunctionArgs): Promise<SettingsActionResult> {
  const form = await request.formData();

  const payload: Record<string, string | number | boolean | string[]> = {};
  for (const key of TEXT_FIELDS) payload[key] = String(form.get(key) ?? "");
  for (const key of NUMBER_FIELDS) payload[key] = Number(form.get(key) ?? 0);
  for (const key of BOOLEAN_FIELDS) payload[key] = form.get(key) === "true";
  payload.holidays = parseList(form.get("holidays"));
  payload.puroks = parseList(form.get("puroks"));

  try {
    const settings = await api
      .patch("settings", { json: payload })
      .json<BarangaySettings>();
    clearBootstrap();
    return { success: true, settings };
  } catch (err: unknown) {
    if (err instanceof HTTPError) {
      const body = err.data as
        | { message?: string; fields?: Record<string, string> }
        | undefined;
      return {
        error: body?.message ?? `Update failed (${err.response.status})`,
        fields: body?.fields,
      };
    }

    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
