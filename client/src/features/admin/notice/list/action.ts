import { HTTPError } from "ky";
import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import type { NoticeActionResult } from "../types";

function toResult(err: unknown): NoticeActionResult {
  if (err instanceof HTTPError) {
    const body = err.data as
      | { message?: string; error?: string; fields?: Record<string, string> }
      | undefined;

    if (body?.fields && Object.keys(body.fields).length > 0) {
      return { fields: body.fields, error: body.message ?? body.error };
    }

    return {
      error:
        body?.message ??
        body?.error ??
        `Request failed (${err.response.status})`,
    };
  }

  return {
    error:
      err instanceof Error
        ? err.message
        : "Something went wrong. Please try again.",
  };
}

export async function noticesAction({
  request,
}: ActionFunctionArgs): Promise<NoticeActionResult> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = Number(form.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Invalid notice." };
  }

  try {
    if (intent === "delete") {
      await api.delete(`/notices/${id}`);
      return { success: true, intent: "delete" };
    }

    if (intent === "update") {
      await api.patch(`/notices/${id}`, {
        json: {
          title: String(form.get("title") ?? ""),
          body: String(form.get("body") ?? ""),
          isPublished: form.get("isPublished") === "on",
        },
      });
      return { success: true, intent: "update" };
    }

    return { error: "Unknown action." };
  } catch (err) {
    return toResult(err);
  }
}
