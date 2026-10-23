import type { ActionFunctionArgs } from "react-router";
import { HTTPError } from "ky";
import { api } from "@/lib/api";
import type { Key } from "@/lib/I18n";
import { rememberReference } from "../reference";

type Update = {
  status: string;
  publicNote: string | null;
  hearingAt: string | null;
  createdAt: string;
};

type Result = { reference: string; status: string; updates: Update[] };

export type TrackActionData = { result?: Result; error?: Key };

// Sent with POST so the phone number never ends up in the URL, history or logs
export async function trackAction({ request }: ActionFunctionArgs): Promise<TrackActionData> {
  const form = await request.formData();

  try {
    const result = await api
      .post("/complaints/track", {
        json: {
          reference: form.get("reference"),
          phone: form.get("phone"),
        },
      })
      .json<Result>();

    rememberReference(result.reference);

    return { result };
  } catch (err: unknown) {
    if (err instanceof HTTPError) {
      const status = err.response.status;
      if (status === 404) return { error: "errNotFound" };
      if (status === 429) return { error: "errTooMany" };
      if (status >= 500) return { error: "errServer" };
    }

    return { error: "errUnavailable" };
  }
}
