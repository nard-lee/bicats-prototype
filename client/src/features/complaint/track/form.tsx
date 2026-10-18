import {
  Form,
  useActionData,
  useNavigation,
  useSearchParams,
  type ActionFunctionArgs,
} from "react-router";
import { HTTPError } from "ky";
import {
  ArrowRightFromLine,
  Calendar,
  CheckCircle2,
  FileText,
  Notebook,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useT, type Key } from "@/lib/I18n";
import { api } from "@/lib/api";

type Update = {
  status: string;
  publicNote: string | null;
  hearingAt: string | null;
  createdAt: string;
};
type Result = { reference: string; status: string; updates: Update[] };
type ActionData = { result?: Result; error?: Key };

// Sent with POST so the phone number never ends up in the URL, history or logs
export async function trackAction({ request }: ActionFunctionArgs): Promise<ActionData> {
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

    return { result };
  } catch (err: unknown) {
    if (err instanceof HTTPError) {
      const status = err.response.status;
      if (status === 404) return { error: "errNotFound" };
      if (status === 429) return { error: "errTooMany" };
    }

    return { error: "errTrack" };
  }
}

export default function Track() {
  const { t, lang } = useT();
  const data = useActionData() as ActionData | undefined;
  const submitting = useNavigation().state === "submitting";
  const [params] = useSearchParams();

  const statusLabel = (status: string) => {
    const key = `st_${status}` as Key;
    return t(key) || status;
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received":
        return <FileText className="h-8 w-8" />;
      case "under_mediation":
        return <Users className="h-8 w-8" />;
      case "settled":
        return <CheckCircle2 className="h-8 w-8" />;
      case "endorsed":
        return <ArrowRightFromLine className="h-4 w-4" />;
      case "dismissed":
        return <XCircle className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  const result = data?.result;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("trackTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("trackIntro")}</p>

      <Form method="post" className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reference">{t("refNumber")}</Label>
          <Input
            id="reference"
            name="reference"
            defaultValue={params.get("ref") ?? ""}
            placeholder="BK-2026-K7M4Q9"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("phoneUsed")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="0917 000 0000"
            required
          />
        </div>

        {data?.error && (
          <p className="text-sm text-destructive">{t(data.error)}</p>
        )}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? t("tracking") : t("trackBtn")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("trackHelp")}</p>
      </Form>

      {result && (
        <div className="mt-10 space-y-6">
          {/* Reference + current status */}
          <Card>
            <CardHeader>
              <CardTitle>{t("complaintDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-md font-medium text-muted-foreground">
                  {t("refNumber")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {result.reference}
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <label className="text-md font-medium text-muted-foreground">
                  {t("currentStatus")}
                </label>
                <Badge variant="outline" className="font-bold">
                  {statusLabel(result.status)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Status history timeline */}
          {result.updates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  {t("statusHistory")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {result.updates.map((event, index) => (
                    <div key={index} className="relative flex gap-4">
                      {/* Timeline line */}
                      {index !== result.updates.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-[-24px] w-px bg-border" />
                      )}

                      {/* Icon bubble */}
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background">
                        {getStatusIcon(event.status)}
                      </div>

                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="flex flex-col gap-2">
                          <Badge variant="outline" className="font-bold">
                            {statusLabel(event.status)}
                          </Badge>
                          <p className="text-md text-muted-foreground">
                            {fmt(event.createdAt)}
                          </p>
                        </div>

                        {(event.publicNote || event.hearingAt) && (
                          <div className="text-md">
                            {event.publicNote && (
                              <div className="flex items-center gap-2">
                                <Notebook className="h-4 w-4" />
                                <p className="text-foreground/80 leading-relaxed">
                                  {event.publicNote}
                                </p>
                              </div>
                            )}

                            {event.hearingAt && (
                              <>
                                {event.publicNote && <Separator className="my-2" />}
                                <div className="flex items-center gap-2 font-medium text-primary">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {t("hearing")}: {fmt(event.hearingAt)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.updates.length > 0 && (
            <div className="text-right text-xs text-muted-foreground">
              {t("filedDate")}: {fmt(result.updates[0].createdAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
