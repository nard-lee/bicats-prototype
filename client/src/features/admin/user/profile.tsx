import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { ArrowLeft, AlertCircle, CheckCircle2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useT } from "@/lib/I18n";
import { ROLE_LABEL, isRole } from "@/lib/roles";
import type { ProfileActionResult } from "./profile-action";
import type { ProfileUser } from "./profile-loader";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

export default function Profile() {
  const { t, lang } = useT();
  const user = useLoaderData() as ProfileUser;
  const actionData = useActionData() as ProfileActionResult | undefined;
  const submitting = useNavigation().state === "submitting";

  const fields = actionData?.fields ?? {};

  const memberSince = new Date(user.createdAt).toLocaleDateString(
    lang === "tl" ? "fil-PH" : "en-PH",
    { dateStyle: "long" },
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link to="/admin">
          <ArrowLeft />
          {t("adminOverview")}
        </Link>
      </Button>

      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserRound className="size-7" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t("myProfile")}</h1>
          <p className="text-sm text-muted-foreground">{t("profileSub")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("accountInfo")}
            {isRole(user.role) && (
              <Badge variant="secondary">{t(ROLE_LABEL[user.role])}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {t("memberSince")}: {memberSince}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            {actionData?.success && (
              <Alert>
                <CheckCircle2 />
                <AlertTitle>{t("profileSaved")}</AlertTitle>
              </Alert>
            )}

            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{actionData.error}</AlertTitle>
                <AlertDescription>
                  {Object.keys(fields).length > 0 && (
                    <p>{t("reviewFields")}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={user.fullName}
                  className="h-11"
                  aria-invalid={!!fields.fullName}
                  required
                />
                <FieldError message={fields.fullName} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">{t("position")}</Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={user.position}
                  className="h-11"
                  aria-invalid={!!fields.position}
                  required
                />
                <FieldError message={fields.position} />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  autoComplete="off"
                  className="h-11"
                  aria-invalid={!!fields.email}
                  required
                />
                <FieldError message={fields.email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={user.phone}
                  autoComplete="off"
                  className="h-11"
                  aria-invalid={!!fields.phone}
                  required
                />
                <FieldError message={fields.phone} />
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <div>
                <p className="font-medium">{t("changePassword")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("newPasswordHint")}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">{t("newPassword")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    className="h-11"
                    aria-invalid={!!fields.password}
                  />
                  <FieldError message={fields.password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">{t("confirm")}</Label>
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    aria-invalid={!!fields.confirm}
                  />
                  <FieldError message={fields.confirm} />
                </div>
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
