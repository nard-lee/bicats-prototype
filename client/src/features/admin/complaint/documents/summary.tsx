import type { ReactNode } from "react";
import { useT, type Key } from "@/lib/I18n";
import { KIND_KEY } from "@/lib/session-kind";
import { complaintTypeLabel } from "../type-label";
import type {
  ComplaintDetail,
  EligibilityStatus,
  ServiceResult,
} from "../view/loader";
import type {
  AttendanceStatus,
  HearingStatus,
} from "@/features/admin/hearing/loader";

type Props = {
  complaint: ComplaintDetail;
  generatedAt: string;
  generatedBy: string;
};

const ELIG_KEY: Record<EligibilityStatus, Key> = {
  unreviewed: "eligNotScreened",
  eligible: "eligStatusEligible",
  needs_review: "eligStatusNeedsReview",
  outside_kp: "eligStatusOutside",
  rejected: "eligStatusRejected",
};

const SERVICE_KEY: Record<ServiceResult, Key> = {
  received: "serviceReceived",
  refused: "serviceRefused",
  not_found: "serviceNotFound",
};

const HEARING_STATUS_KEY: Record<HearingStatus, Key> = {
  scheduled: "sumHsScheduled",
  completed: "sumHsCompleted",
  cancelled: "sumHsCancelled",
  no_show: "sumHsNoShow",
};

const ATTENDANCE_KEY: Record<AttendanceStatus, Key> = {
  present: "sumAttPresent",
  absent: "sumAttAbsent",
  excused: "sumAttExcused",
};

const TERMINAL_STATUSES = ["settled", "certified", "dismissed"];

function Section({
  title,
  avoid = true,
  children,
}: {
  title: string;
  avoid?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={avoid ? "mt-7 break-inside-avoid" : "mt-7"}>
      <h2 className="border-b border-black pb-1 text-[11px] font-bold tracking-wide uppercase">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-black/20 py-1 last:border-0">
      <dt className="w-44 shrink-0 text-[11px] tracking-wide uppercase">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

function Head({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-black/5">
      <tr>
        {cols.map((col) => (
          <th
            key={col}
            className="border-b border-black px-2 py-1 text-left text-[11px] font-bold tracking-wide uppercase"
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Row({ cells }: { cells: ReactNode[] }) {
  return (
    <tr className="break-inside-avoid align-top">
      {cells.map((cell, index) => (
        <td key={index} className="border-b border-black/20 px-2 py-1">
          {cell}
        </td>
      ))}
    </tr>
  );
}

export default function CaseSummaryReport({
  complaint,
  generatedAt,
  generatedBy,
}: Props) {
  const { t, lang } = useT();
  const locale = lang === "tl" ? "fil-PH" : "en-PH";

  const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { dateStyle: "long" });
  const dateTime = (iso: string) =>
    `${longDate(iso)}, ${new Date(iso).toLocaleTimeString(locale, { timeStyle: "short" })}`;

  // Oldest first: a printed record is read as a sequence, the API returns it
  // newest first for the live case page.
  const statusEvents = complaint.history
    .filter((event) => event.kind === "status")
    .reverse();

  const serviceEvents = complaint.serviceRecords.slice().reverse();
  const hearings = complaint.hearings.slice();

  const arbitrationStart = statusEvents.find(
    (event) => event.status === "arbitration",
  );
  const award = hearings
    .filter((hearing) => hearing.kind === "hearing" && hearing.status === "completed")
    .slice()
    .reverse()[0];

  const isClosed = TERMINAL_STATUSES.includes(complaint.status);
  const deadlineCell = !complaint.dueAt
    ? t("sumNoPendingDeadline")
    : isClosed
      ? `${longDate(complaint.dueAt)} - ${t("caseClosed")}`
      : new Date(complaint.dueAt).getTime() < new Date(generatedAt).getTime()
        ? `${longDate(complaint.dueAt)} - ${t("overdue")}`
        : `${longDate(complaint.dueAt)} - ${t("sumOnTime")}`;

  return (
    <div className="mt-6">
      <p className="text-center text-[11px] italic">{t("sumDesc")}</p>

      <dl className="mt-4">
        <Field label={t("sumRefCol")}>{complaint.reference}</Field>
        <Field label={t("sumCaseStatus")}>{t(`st_${complaint.status}` as Key)}</Field>
        <Field label={t("sumFiledOn")}>{dateTime(complaint.createdAt)}</Field>
        <Field label={t("sumGeneratedOn")}>{dateTime(generatedAt)}</Field>
        <Field label={t("sumGeneratedBy")}>{generatedBy}</Field>
      </dl>

      <Section title={t("sumSecParties")}>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <dl>
            <p className="text-[11px] font-bold uppercase">{t("complainant")}</p>
            <Field label={t("fullName")}>{complaint.complainantName}</Field>
            <Field label={t("age")}>{complaint.complainantAge}</Field>
            <Field label={t("purok")}>{complaint.complainantPurok}</Field>
            <Field label={t("contactNumber")}>{complaint.complainantContact}</Field>
            <Field label={t("address")}>{complaint.complainantAddress}</Field>
          </dl>
          <dl>
            <p className="text-[11px] font-bold uppercase">{t("respondent")}</p>
            <Field label={t("fullName")}>{complaint.respondentName}</Field>
            <Field label={t("address")}>{complaint.respondentAddress ?? "-"}</Field>
          </dl>
        </div>

        <dl className="mt-3">
          <Field label={t("complaintType")}>
            {complaintTypeLabel(
              complaint.complaintType,
              complaint.complaintTypeOther,
              t,
            )}
          </Field>
          <Field label={t("incidentAt")}>{dateTime(complaint.incidentAt)}</Field>
          <Field label={t("place")}>{complaint.incidentPlace}</Field>
          <Field label={t("narrative")}>{complaint.description}</Field>
        </dl>
      </Section>

      <Section title={t("sumSecEligibility")}>
        <dl>
          <Field label={t("sumEligDecision")}>{t(ELIG_KEY[complaint.eligibilityStatus])}</Field>
          <Field label={t("sumEligDate")}>
            {complaint.eligibilityReviewedAt
              ? longDate(complaint.eligibilityReviewedAt)
              : "-"}
          </Field>
          {complaint.eligibilityReason && (
            <Field label={t("sumEligReason")}>{complaint.eligibilityReason}</Field>
          )}
          {complaint.eligibilityNotes && (
            <Field label={t("notes")}>{complaint.eligibilityNotes}</Field>
          )}
        </dl>
      </Section>

      <Section title={t("sumSecTimeline")} avoid={false}>
        {statusEvents.length === 0 ? (
          <p>{t("sumNone")}</p>
        ) : (
          <table className="w-full border-collapse">
            <Head cols={[t("sumDateCol"), t("sumFromCol"), t("sumToCol"), t("sumNoteCol"), t("sumByCol")]} />
            <tbody>
              {statusEvents.map((event, index) => {
                const previous = statusEvents[index - 1];
                return (
                  <Row
                    key={`${event.date}-${event.status}-${index}`}
                    cells={[
                      longDate(event.date),
                      previous
                        ? t(`st_${previous.status}` as Key)
                        : t("sumAtFiling"),
                      t(`st_${event.status}` as Key),
                      <div key="notes" className="space-y-1">
                        {event.publicNote && <p>{event.publicNote}</p>}
                        {event.internalNote && (
                          <p>
                            <span className="font-bold uppercase">
                              [{t("sumInternal")}]
                            </span>{" "}
                            {event.internalNote}
                          </p>
                        )}
                      </div>,
                      event.by,
                    ]}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={t("sumSecService")} avoid={false}>
        {serviceEvents.length === 0 ? (
          <p>{t("sumNone")}</p>
        ) : (
          <table className="w-full border-collapse">
            <Head cols={[t("sumDateCol"), t("sumServiceMethod"), t("serviceResult"), t("sumServiceNotes")]} />
            <tbody>
              {serviceEvents.map((record) => (
                <Row
                  key={record.id}
                  cells={[
                    dateTime(record.servedAt),
                    record.serverName,
                    t(SERVICE_KEY[record.result]),
                    record.notes ?? "-",
                  ]}
                />
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={t("sumSecHearings")} avoid={false}>
        {hearings.length === 0 ? (
          <p>{t("sumNone")}</p>
        ) : (
          <table className="w-full border-collapse">
            <Head
              cols={[
                t("sumHearingWhen"),
                t("sumHearingKind"),
                t("sumHearingStatus"),
                t("sumHearingVenue"),
                t("sumHearingAttendance"),
                t("sumHearingOutcome"),
              ]}
            />
            <tbody>
              {hearings.map((hearing) => {
                const attendance = [
                  hearing.complainantAttendance &&
                    `${t("complainant")}: ${t(ATTENDANCE_KEY[hearing.complainantAttendance])}`,
                  hearing.respondentAttendance &&
                    `${t("respondent")}: ${t(ATTENDANCE_KEY[hearing.respondentAttendance])}`,
                ].filter(Boolean);
                return (
                  <Row
                    key={hearing.id}
                    cells={[
                      dateTime(hearing.scheduledAt),
                      t(KIND_KEY[hearing.kind]),
                      t(HEARING_STATUS_KEY[hearing.status]),
                      hearing.location ?? "-",
                      attendance.length ? attendance.join(" / ") : "-",
                      hearing.outcome ?? "-",
                    ]}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={t("sumSecPangkat")}>
        {complaint.pangkatMembers.length === 0 ? (
          <p>{t("pangkatEmpty")}</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {complaint.pangkatMembers.map((member) => (
              <li key={member.id}>
                {member.fullName}
                {member.isChairman && (
                  <span className="font-bold uppercase">
                    {" "}
                    - {t("pangkatChairmanLabel")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("sumSecAward")}>
        <dl>
          <Field label={t("sumAwardHeardBy")}>
            {complaint.arbitrationBy
              ? t(`arbBy_${complaint.arbitrationBy}` as Key)
              : "-"}
          </Field>
          <Field label={t("sumAwardAgreedOn")}>
            {complaint.arbitrationAgreementAt
              ? longDate(complaint.arbitrationAgreementAt)
              : arbitrationStart
                ? longDate(arbitrationStart.date)
                : "-"}
          </Field>
          {award ? (
            <>
              <Field label={t("sumAwardMadeOn")}>{longDate(award.scheduledAt)}</Field>
              <Field label={t("sumHearingOutcome")}>{award.outcome ?? "-"}</Field>
            </>
          ) : (
            <Field label={t("sumHearingOutcome")}>{t("sumAwardNone")}</Field>
          )}
        </dl>
      </Section>

      <Section title={t("sumSecDeadline")}>
        <p>{deadlineCell}</p>
      </Section>

      <Section title={t("sumSecEvidence")} avoid={false}>
        {complaint.evidence.length === 0 ? (
          <p>{t("sumNone")}</p>
        ) : (
          <table className="w-full border-collapse">
            <Head cols={[t("sumEvidenceName"), t("sumEvidenceType")]} />
            <tbody>
              {complaint.evidence.map((file) => (
                <Row key={file.url} cells={[file.originalName, file.mimeType]} />
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <p className="mt-8 break-inside-avoid border-t border-black pt-3 text-[11px] leading-snug">
        {t("sumConfidential")}
      </p>
    </div>
  );
}
