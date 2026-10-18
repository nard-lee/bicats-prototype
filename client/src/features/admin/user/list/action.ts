import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";

export type UsersActionResult = { success?: boolean; error?: string };

export async function usersAction({
  request,
}: ActionFunctionArgs): Promise<UsersActionResult> {
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "toggleActive") {
    const id = Number(form.get("id"));
    const isActive = form.get("isActive") === "true";

    if (!id) return { error: "Invalid account." };

    try {
      await api.patch(`users/${id}`, { json: { isActive } });
      return { success: true };
    } catch {
      return { error: "Could not update the account." };
    }
  }

  return { error: "Unknown action." };
}
