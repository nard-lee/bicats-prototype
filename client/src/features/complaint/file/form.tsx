import { useState, type ReactNode } from "react";
import {
  Form,
  Link,
  useActionData,
  useNavigate,
  useNavigation,
} from "react-router";
import { AlertCircle, CheckCircle2, Eye, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { complaintTypeKeys, useT } from "@/lib/I18n";
import type { ActionResult } from "./action";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const puroks = [
  "Session Road",
  "Assumption Road",
  "Mabini Street",
  "General Luna Road",
  "Fr. Carlu Street"
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (<p className="text-sm font-medium text-destructive">{message}</p>);
}

function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border">
      <div className="border-b bg-muted/50 px-5 py-3">
        <h2 className="font-semibold">
          <span className="mr-2 text-muted-foreground">{number}</span>
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function FileComplaint() {
  const { t } = useT();
  const navigate = useNavigate();
  const [files, setFiles] = useState<string[]>([]);

  const actionData = useActionData() as ActionResult | undefined;
  const submitting = useNavigation().state === "submitting";
  const fields = actionData?.fields ?? {};

  const reference = actionData?.reference;

  if (actionData?.success && reference) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-lg border p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-8" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            {t("fcSuccessTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("fcSuccessText")}
          </p>

          <div className="mt-6 rounded-md border bg-muted/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("refNumber")}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-wider">{reference}</p>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {t("fcSuccessNote")}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link to={`/track-complaint?ref=${reference}`}>
                <Eye className="mr-2 size-4" />
                {t("fcViewComplaint")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setFiles([]);
                navigate("/file-complaint", { replace: true });
              }}
            >
              {t("fcFileAnother")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("fcTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("fcIntro")}</p>

      <Form
        method="post"
        encType="multipart/form-data"
        className="mt-8 space-y-6"
      >

        {/* 01 Complainant */}
        <Section number="01" title={t("s1Title")} subtitle={t("s1Sub")}>
          <Field label={t("fullName")}>
            <Input
              name="complainantName"
              placeholder="Juan A. Dela Cruz"
              aria-invalid={!!fields.complainantName}
            />
            <FieldError message={fields.complainantName} />
          </Field>
          <Field label={t("age")}>
            <Input
              name="complainantAge"
              type="number"
              min={1}
              placeholder="34"
              aria-invalid={!!fields.complainantAge}
            />
            <FieldError message={fields.complainantAge} />
          </Field>
          <Field label={t("purok")}>
            <Select name="complainantPurok">
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectPurok")} />
              </SelectTrigger>
              <SelectContent>
                {puroks.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fields.complainantPurok} />
          </Field>
          <Field label={t("contactNumber")}>
            <Input
              name="complainantContact"
              type="tel"
              placeholder="0917 000 0000"
              aria-invalid={!!fields.complainantContact}
            />
            <FieldError message={fields.complainantContact} />
          </Field>
          <Field label={t("address")} full>
            <Input
              name="complainantAddress"
              placeholder="Blk / Lot / Street"
              aria-invalid={!!fields.complainantAddress}
            />
            <FieldError message={fields.complainantAddress} />
          </Field>
        </Section>

        {/* 02 Respondent */}
        <Section number="02" title={t("s2Title")} subtitle={t("s2Sub")}>
          <Field label={t("respName")}>
            <Input
              name="respondentName"
              placeholder={t("phRespName")}
              aria-invalid={!!fields.respondentName}
            />
            <FieldError message={fields.respondentName} />
          </Field>
          <Field label={t("respAddress") + " (optional)"}>
            <Input
              name="respondentAddress"
              placeholder="Blk / Lot / Street"
              aria-invalid={!!fields.respondentAddress}
            />
            <FieldError message={fields.respondentAddress} />
          </Field>
          <Field label={t("relationship") + " (optional)"} hint={t("relHint")} full>
            <Input
              name="relationship"
              placeholder={t("phRel")}
              aria-invalid={!!fields.relationship}
            />
            <FieldError message={fields.relationship} />
          </Field>
        </Section>

        {/* 03 Incident */}
        <Section number="03" title={t("s3Title")} subtitle={t("s3Sub")}>
          <Field label={t("complaintType")}>
            <Select name="complaintType">
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectType")} />
              </SelectTrigger>
              <SelectContent>
                {complaintTypeKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fields.complaintType} />
          </Field>
          <Field label={t("incidentAt")}>
            <Input
              name="incidentAt"
              type="datetime-local"
              aria-invalid={!!fields.incidentAt}
            />
            <FieldError message={fields.incidentAt} />
          </Field>
          <Field label={t("place")} full>
            <Input
              name="incidentPlace"
              placeholder={t("phPlace")}
              aria-invalid={!!fields.incidentPlace}
            />
            <FieldError message={fields.incidentPlace} />
          </Field>
          <Field label={t("narrative")} hint={t("narrHint")} full>
            <Textarea
              name="narrative"
              rows={7}
              placeholder={t("phNarr")}
              aria-invalid={!!fields.narrative}
            />
            <FieldError message={fields.narrative} />
          </Field>

          <Field label={t("evidence")} hint={t("evHint")} full>
            <label className="relative flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed bg-muted/50 px-4 py-10 text-center text-sm">
              <Upload className="size-6 text-muted-foreground" />
              <span>{t("dropFiles")}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="size-3" /> JPG, PNG, PDF, MP4
              </span>
              <input
                type="file"
                name="evidence"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.mp4"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) =>
                  setFiles(Array.from(e.target.files ?? []).map((f) => f.name))
                }
              />
            </label>
            {files.length > 0 && (
              <ul className="text-xs text-muted-foreground">
                {files.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </Field>
        </Section>

        {/* Consent */}
        <div className="flex items-start gap-3 rounded-md border bg-muted/50 p-5">
          <Checkbox id="consent" name="consent" className="mt-1" aria-invalid={!!fields.consent} />
          <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
            {t("consentA")}
            <strong>Katarungang Pambarangay</strong>
            {t("consentC")}
          </Label>
          <FieldError message={fields.consent} />
        </div>

        {(actionData?.message ||
          (actionData?.error && !actionData.message)) && (

            <Alert>
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <AlertTitle>{actionData.message || t(actionData.error!)}</AlertTitle>
              <AlertDescription>
                {Object.keys(fields).length > 0 && (
                  <p className="text-sm">
                    Please review the highlighted fields.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

        <div className="flex items-center gap-4">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? t("submitting") : t("submitComplaint")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("refNote")}</p>
        </div>
      </Form>
    </div>
  );
}