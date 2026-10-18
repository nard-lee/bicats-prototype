
import { HTTPError } from "ky";
import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import type { Key } from "@/lib/I18n";

export type ActionResult = {
    success?: boolean;
    error?: Key;
    message?: string;
    fields?: Record<string, string>;
};

export async function createUserAction({ request }: ActionFunctionArgs): Promise<ActionResult> {
    const form = await request.formData();

    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password !== confirm) return { error: "errMismatch" };

    try {
        await api.post("users/create", {
            json: {
                fullName: form.get("fullName"),
                position: form.get("position"),
                email: form.get("email"),
                phone: form.get("phone"),
                username: form.get("username"),
                password,
                role: form.get("role"),
            },
        });

        return { success: true };
    } catch (err: unknown) {
        if (err instanceof HTTPError) {
            const status = err.response.status;
            const body = err.data as
                | {
                    error?: string;
                    message?: string;
                    fields?: Record<string, string>;
                }
                | undefined;

            if (body?.fields && Object.keys(body.fields).length > 0) {
                return {
                    fields: body.fields,
                    message: body.error ?? body.message,
                };
            }

            if (status === 409) {
                return {
                    error: "errTaken",
                    message: body?.error ?? body?.message,
                };
            }

            return {
                error: "errFailed",
                message:
                    body?.error ??
                    body?.message ??
                    `Request failed (${status})`,
            };
        }

        return {
            error: "errFailed",
            message: err instanceof Error ? err.message : "An unexpected error occurred.",
        };

    }
}