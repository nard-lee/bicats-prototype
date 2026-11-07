import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "react-router";
import {
  AlertCircle,
  Eye,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { cn } from "cn";
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
import DateTimePicker from "@/components/ui/date-time-picker";
import { complaintTypeKeys, useT } from "@/lib/I18n";
import type { ActionResult } from "./action";
import type { FileComplaintLoaderData } from "./loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  EMPTY_ELIGIBILITY,
  evaluateIntakeEligibility,
  type EligibilityFormState,
} from "./eligibility";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf", "video/mp4"]);
// Mirrors the server's normalizePhone + /^09\d{9}$/ check: a leading 0 or 63,
// then ten digits, with spaces, dots or dashes allowed between them. Browsers
// compile `pattern` with the regex `v` flag, where `-` and `.` must be escaped
// inside a character class or the whole constraint is silently dropped.
const PHONE_PATTERN = String.raw`(?:\+?63|0)[\-\.\s]?9(?:[\-\.\s]?\d){9}`;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (<p className="text-sm font-medium text-destructive">{message}</p>);
}

function Choice({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: keyof EligibilityFormState;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
        checked
          ? "border-primary/40 bg-primary/5 font-medium text-primary dark:text-status-ink"
          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="peer sr-only"
        required
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card",
          checked ? "border-primary dark:border-status-ink" : "border-input",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary dark:bg-status-ink" />}
      </span>
      <span>{children}</span>
    </label>
  );
}

function ScreeningQuestion({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
      <FieldError message={error} />
    </div>
  );
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
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-border dark:ring-background">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold tabular-nums text-primary dark:bg-primary/25 dark:text-status-ink">
          {number}
        </span>
        <div>
          <h2 className="font-heading text-base font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  full,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function FileComplaint() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [incidentAt, setIncidentAt] = useState("");
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [complaintType, setComplaintType] = useState("");
  const [eligibility, setEligibility] =
    useState<EligibilityFormState>(EMPTY_ELIGIBILITY);

  const screening = evaluateIntakeEligibility(eligibility);
  const blocked = screening === "outside_kp";

  function updateEligibility(patch: Partial<EligibilityFormState>) {
    setEligibility((prev) => {
      const next = { ...prev, ...patch };
      // Conditional answers must not linger after their trigger changes.
      if (next.eligResidency !== "different_city") next.eligAdjoining = "";
      if (next.eligProperty !== "yes") next.eligPropertyAgreement = "";
      return next;
    });
  }

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);

    const fail = (message: string) => {
      setFileError(message);
      setFiles([]);
      resetInput();
    };

    if (selected.length > MAX_FILES) {
      fail(t("evTooMany").replace("{max}", String(MAX_FILES)));
      return;
    }

    const badType = selected.find((f) => !ALLOWED_TYPES.has(f.type));
    if (badType) {
      fail(
        t("evBadType")
          .replace("{name}", badType.name)
          .replace("{allowed}", t("evAllowed")),
      );
      return;
    }

    const tooBig = selected.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      fail(
        t("evTooBig")
          .replace("{name}", tooBig.name)
          .replace("{size}", `${MAX_FILE_SIZE / (1024 * 1024)} MB`),
      );
      return;
    }

    setFileError(null);
    setFiles(selected);
  }

  function clearFiles() {
    setFiles([]);
    setFileError(null);
    resetInput();
  }

  const actionData = useActionData() as ActionResult | undefined;
  const submitting = useNavigation().state === "submitting";
  const { puroks } = useLoaderData() as FileComplaintLoaderData;
  const fields = actionData?.fields ?? {};

  // A rejected filing shouldn't send a complainant hunting through a long form:
  // jump to the first field the office flagged.
  useEffect(() => {
    const [firstInvalid] = Object.keys(actionData?.fields ?? {});
    if (!firstInvalid) return;
    const control = document.getElementById(firstInvalid);
    if (!control) return;
    control.scrollIntoView({ block: "center", behavior: "smooth" });
    control.focus({ preventScroll: true });
  }, [actionData]);

  const reference = actionData?.reference;

  if (actionData?.success && reference) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-xl bg-card p-8 text-center ring-1 ring-border dark:ring-background">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("fcSuccessTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("fcSuccessText")}
          </p>

          <div className="mt-8 rounded-xl bg-primary/5 px-4 py-6 ring-1 ring-border dark:ring-background">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("refNumber")}
            </p>
            <p className="mt-2 font-heading text-2xl font-extrabold tracking-wider tabular-nums">
              {reference}
            </p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {t("fcSuccessNote")}
          </p>

          {screening === "needs_review" && (
            <p className="mt-4 rounded-md bg-primary/5 px-4 py-3 text-sm font-medium text-destructive ring-1 ring-border dark:ring-background">
              {t("eligSuccessReview")}
            </p>
          )}

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
                clearFiles();
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-xl bg-primary/5 px-5 py-8 text-center ring-1 ring-border dark:ring-background sm:px-7 sm:py-10">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.28em] text-primary dark:text-status-ink">
          Barangay Kabayanihan · Online Desk
        </p>
        <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">{t("fcTitle")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{t("fcIntro")}</p>

        <ol className="mt-8 grid gap-x-8 gap-y-6 text-sm sm:grid-cols-3">
          {[
            ["1", "Your details", "Tell us how to contact you."],
            ["2", "Incident", "Describe what happened."],
            ["3", "Submit", "Keep your reference number."],
          ].map(([step, title, description]) => (
            <li key={step} className="flex flex-col items-center">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold tabular-nums text-primary dark:bg-primary/25 dark:text-status-ink">
                {step}
              </span>
              <p className="mt-2 font-medium">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </div>

      <Form
        method="post"
        encType="multipart/form-data"
        className="mt-8 space-y-6"
        onSubmit={(event) => {
          if (blocked) {
            event.preventDefault();
            return;
          }
          // Every other mandatory control carries a native `required`; the
          // incident picker is a button, so it is guarded here instead.
          if (!incidentAt) {
            event.preventDefault();
            setIncidentError(t("fcPickIncident"));
            document
              .getElementById("incidentAt")
              ?.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }}
      >

        {/* SMS and email about this case go out in whichever language the
            filer read the form in. */}
        <input type="hidden" name="complainantLang" value={lang} />

        {/* 00 Eligibility screening */}
        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-border dark:ring-background">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/25 dark:text-status-ink">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <h2 className="font-heading text-base font-bold tracking-tight">
                {t("eligTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("eligIntro")}</p>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <ScreeningQuestion
              label={t("eligResidencyQ")}
              error={fields.eligResidency}
            >
              {(
                [
                  ["same_barangay", "eligResSameBarangay"],
                  ["same_city", "eligResSameCity"],
                  ["different_city", "eligResDifferentCity"],
                  ["unsure", "eligUnsure"],
                ] as const
              ).map(([value, key]) => (
                <Choice
                  key={value}
                  name="eligResidency"
                  value={value}
                  checked={eligibility.eligResidency === value}
                  onChange={(next) =>
                    updateEligibility({
                      eligResidency: next as EligibilityFormState["eligResidency"],
                    })
                  }
                >
                  {t(key)}
                </Choice>
              ))}
            </ScreeningQuestion>

            {eligibility.eligResidency === "different_city" && (
              <ScreeningQuestion
                label={t("eligAdjoiningQ")}
                error={fields.eligAdjoining}
              >
                {(
                  [
                    ["yes", "eligYes"],
                    ["no", "eligNo"],
                    ["unsure", "eligUnsure"],
                  ] as const
                ).map(([value, key]) => (
                  <Choice
                    key={value}
                    name="eligAdjoining"
                    value={value}
                    checked={eligibility.eligAdjoining === value}
                    onChange={(next) =>
                      updateEligibility({
                        eligAdjoining: next as EligibilityFormState["eligAdjoining"],
                      })
                    }
                  >
                    {t(key)}
                  </Choice>
                ))}
              </ScreeningQuestion>
            )}

            <ScreeningQuestion
              label={t("eligGovernmentQ")}
              error={fields.eligGovernment}
            >
              {(
                [
                  ["yes", "eligYes"],
                  ["no", "eligNo"],
                  ["unsure", "eligUnsure"],
                ] as const
              ).map(([value, key]) => (
                <Choice
                  key={value}
                  name="eligGovernment"
                  value={value}
                  checked={eligibility.eligGovernment === value}
                  onChange={(next) =>
                    updateEligibility({
                      eligGovernment: next as EligibilityFormState["eligGovernment"],
                    })
                  }
                >
                  {t(key)}
                </Choice>
              ))}
            </ScreeningQuestion>

            <ScreeningQuestion
              label={t("eligOffenseQ")}
              error={fields.eligOffense}
            >
              {(
                [
                  ["yes", "eligYes"],
                  ["no", "eligNo"],
                  ["unsure", "eligUnsure"],
                ] as const
              ).map(([value, key]) => (
                <Choice
                  key={value}
                  name="eligOffense"
                  value={value}
                  checked={eligibility.eligOffense === value}
                  onChange={(next) =>
                    updateEligibility({
                      eligOffense: next as EligibilityFormState["eligOffense"],
                    })
                  }
                >
                  {t(key)}
                </Choice>
              ))}
            </ScreeningQuestion>

            <ScreeningQuestion
              label={t("eligPropertyQ")}
              error={fields.eligProperty}
            >
              {(
                [
                  ["yes", "eligYes"],
                  ["no", "eligNo"],
                  ["not_applicable", "eligNa"],
                  ["unsure", "eligUnsure"],
                ] as const
              ).map(([value, key]) => (
                <Choice
                  key={value}
                  name="eligProperty"
                  value={value}
                  checked={eligibility.eligProperty === value}
                  onChange={(next) =>
                    updateEligibility({
                      eligProperty: next as EligibilityFormState["eligProperty"],
                    })
                  }
                >
                  {t(key)}
                </Choice>
              ))}
            </ScreeningQuestion>

            {eligibility.eligProperty === "yes" && (
              <ScreeningQuestion
                label={t("eligPropertyAgreementQ")}
                error={fields.eligPropertyAgreement}
              >
                {(
                  [
                    ["yes", "eligYes"],
                    ["no", "eligNo"],
                    ["unsure", "eligUnsure"],
                  ] as const
                ).map(([value, key]) => (
                  <Choice
                    key={value}
                    name="eligPropertyAgreement"
                    value={value}
                    checked={eligibility.eligPropertyAgreement === value}
                    onChange={(next) =>
                      updateEligibility({
                        eligPropertyAgreement:
                          next as EligibilityFormState["eligPropertyAgreement"],
                      })
                    }
                  >
                    {t(key)}
                  </Choice>
                ))}
              </ScreeningQuestion>
            )}

            {screening === "eligible" && (
              <div className="flex items-start gap-3 rounded-lg bg-primary/5 px-5 py-4 text-sm ring-1 ring-border dark:ring-background sm:col-span-2">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary dark:text-status-ink" />
                <p>{t("eligEligible")}</p>
              </div>
            )}

            {screening === "needs_review" && (
              <div className="flex items-start gap-3 rounded-lg bg-primary/5 px-5 py-4 text-sm ring-1 ring-border dark:ring-background sm:col-span-2">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                <p>{t("eligNeedsReview")}</p>
              </div>
            )}

            {screening === "outside_kp" && (
              <div className="flex items-start gap-3 rounded-lg bg-primary/5 px-5 py-4 text-sm ring-1 ring-border dark:ring-background sm:col-span-2">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                <p>{t("eligOutside")}</p>
              </div>
            )}
          </div>
        </section>

        {/* 01 Complainant */}
        <Section number="01" title={t("s1Title")} subtitle={t("s1Sub")}>
          <Field id="complainantName" label={t("fullName")}>
            <Input
              id="complainantName"
              name="complainantName"
              placeholder="Juan A. Dela Cruz"
              required
              aria-invalid={!!fields.complainantName}
            />
            <FieldError message={fields.complainantName} />
          </Field>
          <Field id="complainantAge" label={t("age")} hint={t("ageHint")}>
            <Input
              id="complainantAge"
              name="complainantAge"
              type="number"
              inputMode="numeric"
              min={18}
              max={120}
              placeholder="34"
              required
              aria-invalid={!!fields.complainantAge}
            />
            <FieldError message={fields.complainantAge} />
          </Field>
          <Field id="complainantPurok" label={t("purok")}>
            <Select name="complainantPurok" required>
              <SelectTrigger id="complainantPurok" className="w-full">
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
          <Field id="complainantContact" label={t("contactNumber")} hint={t("contactHint")}>
            <Input
              id="complainantContact"
              name="complainantContact"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0917 000 0000"
              pattern={PHONE_PATTERN}
              title={t("contactHint")}
              required
              aria-invalid={!!fields.complainantContact}
            />
            <FieldError message={fields.complainantContact} />
          </Field>
          <Field
            id="complainantEmail"
            label={t("emailOptional")}
            hint={t("emailHint")}
          >
            <Input
              id="complainantEmail"
              name="complainantEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="juan@email.com"
              aria-invalid={!!fields.complainantEmail}
            />
            <FieldError message={fields.complainantEmail} />
          </Field>
          <Field id="complainantAddress" label={t("address")} full>
            <Input
              id="complainantAddress"
              name="complainantAddress"
              placeholder="Blk / Lot / Street"
              required
              aria-invalid={!!fields.complainantAddress}
            />
            <FieldError message={fields.complainantAddress} />
          </Field>
        </Section>

        {/* 02 Respondent */}
        <Section number="02" title={t("s2Title")} subtitle={t("s2Sub")}>
          <Field id="respondentName" label={t("respName")}>
            <Input
              id="respondentName"
              name="respondentName"
              placeholder={t("phRespName")}
              required
              aria-invalid={!!fields.respondentName}
            />
            <FieldError message={fields.respondentName} />
          </Field>
          <Field id="respondentAddress" label={t("respAddressOptional")}>
            <Input
              id="respondentAddress"
              name="respondentAddress"
              placeholder="Blk / Lot / Street"
              aria-invalid={!!fields.respondentAddress}
            />
            <FieldError message={fields.respondentAddress} />
          </Field>
          <Field
            id="relationship"
            label={t("relationshipOptional")}
            hint={t("relHint")}
            full
          >
            <Input
              id="relationship"
              name="relationship"
              placeholder={t("phRel")}
              aria-invalid={!!fields.relationship}
            />
            <FieldError message={fields.relationship} />
          </Field>
        </Section>

        {/* 03 Incident */}
        <Section number="03" title={t("s3Title")} subtitle={t("s3Sub")}>
          <Field id="complaintType" label={t("complaintType")}>
            <Select
              name="complaintType"
              value={complaintType}
              onValueChange={setComplaintType}
              required
            >
              <SelectTrigger id="complaintType" className="w-full">
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
          {complaintType === "type12" && (
            <Field id="complaintTypeOther" label={t("otherType")} hint={t("otherTypeHint")} full>
              <Input
                id="complaintTypeOther"
                name="complaintTypeOther"
                required
                maxLength={150}
                placeholder={t("phOtherType")}
                aria-invalid={!!fields.complaintTypeOther}
              />
              <FieldError message={fields.complaintTypeOther} />
            </Field>
          )}
          <Field id="incidentAt" label={t("incidentAt")}>
            <DateTimePicker
              id="incidentAt"
              value={incidentAt}
              onChange={(next) => {
                setIncidentAt(next);
                setIncidentError(null);
              }}
              disableFuture
              aria-invalid={!!(incidentError || fields.incidentAt)}
            />
            <input type="hidden" name="incidentAt" value={incidentAt} />
            <FieldError message={incidentError ?? fields.incidentAt} />
          </Field>
          <Field id="incidentPlace" label={t("place")} full>
            <Input
              id="incidentPlace"
              name="incidentPlace"
              placeholder={t("phPlace")}
              required
              aria-invalid={!!fields.incidentPlace}
            />
            <FieldError message={fields.incidentPlace} />
          </Field>
          <Field id="narrative" label={t("narrative")} hint={t("narrHint")} full>
            <Textarea
              id="narrative"
              name="narrative"
              rows={7}
              placeholder={t("phNarr")}
              required
              aria-invalid={!!fields.narrative}
            />
            <FieldError message={fields.narrative} />
          </Field>

          <Field id="evidence" label={t("evidence")} hint={t("evHint")} full>
            <label className="relative flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed bg-muted/50 px-4 py-10 text-center text-sm">
              <Upload className="size-6 text-muted-foreground" />
              <span>{t("dropFiles")}</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Paperclip className="size-3" /> {t("evAllowed")}
              </span>
              <input
                id="evidence"
                ref={inputRef}
                type="file"
                name="evidence"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.mp4"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={handleFiles}
              />
            </label>
            {fileError && (
              <p className="text-sm font-medium text-destructive">{fileError}</p>
            )}
            {files.length > 0 && (
              <div className="space-y-2">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {files.map((f) => (
                    <li
                      key={`${f.name}-${f.size}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{f.name}</span>
                      <span className="shrink-0">{formatSize(f.size)}</span>
                    </li>
                  ))}
                </ul>
                <Button type="button" variant="ghost" size="sm" onClick={clearFiles}>
                  {t("clearFiles")}
                </Button>
              </div>
            )}
          </Field>
        </Section>

        {/* Consent */}
        <div className="flex items-start gap-3 rounded-lg bg-primary/5 px-5 py-6 ring-1 ring-border dark:ring-background">
          <Checkbox
            id="consent"
            name="consent"
            required
            className="mt-1"
            aria-invalid={!!fields.consent}
          />
          <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
            <span>
              {t("consentA")}
              <strong>Katarungang Pambarangay</strong>
              {t("consentC")}
            </span>
          </Label>
          <FieldError message={fields.consent} />
        </div>

        {(actionData?.message ||
          (actionData?.error && !actionData.message)) && (

            <Alert variant="destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <AlertTitle>{actionData.message || t(actionData.error!)}</AlertTitle>
              <AlertDescription>
                {Object.keys(fields).length > 0 && (
                  <p className="text-sm">{t("reviewFields")}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

        <div className="sticky bottom-3 flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-border dark:ring-background backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("refNote")}</p>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || blocked}
            className="sm:min-w-48"
          >
            {submitting ? t("submitting") : t("submitComplaint")}
          </Button>
        </div>
      </Form>
    </div>
  );
}
