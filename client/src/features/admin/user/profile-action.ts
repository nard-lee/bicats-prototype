import { HTTPError } from "ky";
import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import { clearCurrentUser } from "@/hooks/use-auth";

export type ProfileActionResult = {
  success?: boolean;
  error?: string;
  fields?: Record<string, string>;
};

export async function profileAction({
  request,
}: ActionFunctionArgs): Promise<ProfileActionResult> {
  const form = await request.formData();

  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (password && password !== confirm) {
    return { fields: { confirm: "Passwords do not match." } };
  }

  const payload: Record<string, string> = {
    fullName: String(form.get("fullName") ?? ""),
    position: String(form.get("position") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
  };
  if (password) payload.password = password;

  try {
    await api.patch("users/me", { json: payload });
    clearCurrentUser();
    return { success: true };
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
