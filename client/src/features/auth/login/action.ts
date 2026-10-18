
import { HTTPError } from "ky";
import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import { clearCurrentUser } from "@/hooks/use-auth";
import type { Key } from "@/lib/I18n";
import { toast } from "sonner";
import { redirect } from "react-router";

export type ActionResult = {
    success?: boolean;
    error?: Key;
    message?: string;
    fields?: Record<string, string>;
};

export async function loginAction({ request, }: ActionFunctionArgs): Promise<ActionResult | Response> {
    const form = await request.formData();

    try {
        await api.post("auth/log-in", {
            json: {
                identifier: form.get("identifier"),
                password: form.get("password")
            },
        });
        toast.success("Logged in successfully...");
        clearCurrentUser();
        return redirect("/admin");
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