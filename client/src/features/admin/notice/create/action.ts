import { HTTPError } from "ky";
import { redirect, type ActionFunctionArgs } from "react-router";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { NoticeActionResult } from "../types";

export async function createNoticeAction({
  request,
}: ActionFunctionArgs): Promise<NoticeActionResult | Response> {
  const form = await request.formData();

  try {
    await api.post("/notices/create", {
      json: {
        title: String(form.get("title") ?? ""),
        body: String(form.get("body") ?? ""),
        isPublished: form.get("isPublished") === "on",
      },
    });

    toast.success("Notice created.");
    return redirect("/admin/notices");
  } catch (err: unknown) {
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
}
