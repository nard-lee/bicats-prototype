import {
  Form,
  Navigate,
  useActionData,
  useNavigation,
  useRouteLoaderData,
} from "react-router";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthCard from "../AuthCard";
import type { ActionResult } from "./action";
import { useT } from "@/lib/I18n";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (<p className="text-sm font-medium text-destructive">{message}</p>);
}

export default function Login() {
  const user = useRouteLoaderData("root");
  const { t } = useT();
  const actionData = useActionData() as ActionResult | undefined;
  const submitting = useNavigation().state === "submitting";
  const fields = actionData?.fields ?? {};

  if (user) return <Navigate to="/admin" replace />;

  return (
    <AuthCard
      icon={<ShieldCheck className="size-8" />}
      title="Barangay Staff Sign In"
      subtitle="Para sa mga opisyal at kawani lamang"
    >

      <Form method="post" className="space-y-5">

        {(actionData?.message ||
          (actionData?.error && !actionData.message)) && (

            <Alert>
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <AlertTitle>{actionData.message || t(actionData.error!)}</AlertTitle>
              <AlertDescription>
                {Object.keys(fields).length > 0 && (
                  <p className="text-sm">
                    Please review the highlighted fields below.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

        <div className="space-y-2">
          <Label htmlFor="email">identifier</Label>
          <Input
            id="identifier"
            name="identifier"
            type="identifier"
            placeholder="juan@example.com"
            value="+639386161262"
            autoComplete="off"
            className="h-11"
            aria-invalid={!!fields.identifier}
            required
          />
          <FieldError message={fields.identifier} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value="password123"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            className="h-11"
            aria-invalid={!!fields.password}
            required
          />
          <FieldError message={fields.password} />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" name="remember" />
          <Label htmlFor="remember" className="font-normal">
            Alalahanin ang device na ito
          </Label>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Nag-sa-sign in..." : "Mag-sign in"}
        </Button>
      </Form>

      <p className="text-center text-xs text-muted-foreground">
        Nakalimutan ang password? Lapitan ang Barangay Secretary sa hall.
      </p>
    </AuthCard>
  );
}