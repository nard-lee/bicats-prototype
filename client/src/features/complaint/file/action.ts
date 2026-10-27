import { HTTPError } from "ky";
import type { ActionFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import { compressEvidence } from "@/lib/images";
import type { Key } from "@/lib/I18n";
import { rememberReference } from "../reference";

export type ActionResult = {
  success?: boolean;
  reference?: string;
  error?: Key;
  message?: string;
  fields?: Record<string, string>;
};

export async function fileComplaintAction({
  request,
}: ActionFunctionArgs): Promise<ActionResult> {
  const form = await request.formData();
  await compressEvidence(form);

  try {
    const { reference } = await api
      .post("complaints/file-complaint", { body: form })
      .json<{ reference: string }>();

    rememberReference(reference);

    return { success: true, reference };
  } catch (err: unknown) {
    if (err instanceof HTTPError) {
      const status = err.response.status;

      const body = err.data as
        | { error?: string; message?: string; fields?: Record<string, string> }
        | undefined;

      if (body?.fields && Object.keys(body.fields).length > 0) {
        return {
          fields: body.fields,
          message: body.error ?? body.message,
        };
      }

      if (status === 429) return { error: "errTooMany" };
      if (status >= 500) return { error: "errServer" };

      return {
        error: "errFailed",
        message: body?.error ?? body?.message ?? `Request failed (${status})`,
      };
    }

    return { error: "errUnavailable" };
  }
}
