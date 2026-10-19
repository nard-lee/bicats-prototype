import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { AlertCircle, CheckCircle2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useT } from "@/lib/I18n";
import type { SettingsActionResult } from "./action";
import type { BarangaySettings } from "./loader";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

export default function BarangaySettingsPage() {
  const { t } = useT();
  const settings = useLoaderData() as BarangaySettings;
  const actionData = useActionData() as SettingsActionResult | undefined;
  const submitting = useNavigation().state === "submitting";

  const fields = actionData?.fields ?? {};

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Settings className="size-7" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t("adminSettings")}</h1>
          <p className="text-sm text-muted-foreground">{t("settingsSub")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("barangayProfile")}</CardTitle>
          <CardDescription>{t("settingsLetterhead")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            {actionData?.success && (
              <Alert>
                <CheckCircle2 />
                <AlertTitle>{t("settingsSaved")}</AlertTitle>
              </Alert>
            )}

            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{actionData.error}</AlertTitle>
                <AlertDescription>
                  {Object.keys(fields).length > 0 && <p>{t("reviewFields")}</p>}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="barangayName">{t("barangayName")}</Label>
                <Input
                  id="barangayName"
                  name="barangayName"
                  defaultValue={settings.barangayName}
                  className="h-11"
                  aria-invalid={!!fields.barangayName}
                  required
                />
                <FieldError message={fields.barangayName} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">{t("cityLabel")}</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={settings.city}
                  className="h-11"
                  aria-invalid={!!fields.city}
                  required
                />
                <FieldError message={fields.city} />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="province">{t("province")}</Label>
                <Input
                  id="province"
                  name="province"
                  defaultValue={settings.province}
                  className="h-11"
                  aria-invalid={!!fields.province}
                />
                <FieldError message={fields.province} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("address")}</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={settings.address}
                  className="h-11"
                  aria-invalid={!!fields.address}
                />
                <FieldError message={fields.address} />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">{t("contactNumber")}</Label>
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  type="tel"
                  defaultValue={settings.contactNumber}
                  className="h-11"
                  aria-invalid={!!fields.contactNumber}
                />
                <FieldError message={fields.contactNumber} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={settings.email}
                  className="h-11"
                  aria-invalid={!!fields.email}
                />
                <FieldError message={fields.email} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="officeHours">{t("officeHours")}</Label>
              <Input
                id="officeHours"
                name="officeHours"
                defaultValue={settings.officeHours}
                className="h-11"
                aria-invalid={!!fields.officeHours}
              />
              <FieldError message={fields.officeHours} />
            </div>

            <div className="grid gap-6 border-t pt-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="punongBarangay">{t("punongBarangay")}</Label>
                <Input
                  id="punongBarangay"
                  name="punongBarangay"
                  defaultValue={settings.punongBarangay}
                  className="h-11"
                  aria-invalid={!!fields.punongBarangay}
                />
                <FieldError message={fields.punongBarangay} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="luponChairman">{t("luponChairman")}</Label>
                <Input
                  id="luponChairman"
                  name="luponChairman"
                  defaultValue={settings.luponChairman}
                  className="h-11"
                  aria-invalid={!!fields.luponChairman}
                />
                <FieldError message={fields.luponChairman} />
              </div>
            </div>

            <div className="flex justify-end border-t pt-6">
              <Button type="submit" disabled={submitting}>
                {submitting ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
