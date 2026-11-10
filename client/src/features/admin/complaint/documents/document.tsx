import { useEffect, type ReactNode } from "react";
import { Link, useLoaderData, useParams } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/language-toggle";
import { useT, type Key } from "@/lib/I18n";
import { kindForStatus } from "@/lib/session-kind";
import type { DocumentLoaderData, PrintableType } from "./loader";
import type { BarangaySettings } from "@/features/admin/setting/loader";
import { complaintTypeLabel } from "../type-label";
import CaseSummaryReport from "./summary";

const DOC_TITLE_KEY: Record<PrintableType, Key> = {
  summons: "doc_summons",
  notice: "doc_notice",
  settlement: "doc_settlement",
  cfa: "doc_cfa",
  summary: "doc_summary",
};

const BLANK = "_____________________";
const FIELD = "____________________";

function Letterhead({ settings }: { settings: BarangaySettings }) {
  const { t } = useT();
  return (
    <header className="border-b-2 border-black pb-3 text-center">
      {settings.logoUrl && (
        <img
          src={settings.logoUrl}
          alt=""
          className="mx-auto mb-2 h-16 object-contain"
        />
      )}
      <p className="text-xs tracking-wide uppercase">{t("republic")}</p>
      <p className="text-sm font-semibold tracking-wide uppercase">
        {settings.province ? `${settings.province} · ` : ""}
        {settings.city}
      </p>
      <p className="text-base font-bold tracking-wide uppercase">
        {settings.barangayName}
      </p>
      <p className="text-xs tracking-wide uppercase">{settings.documentOfficeLine}</p>
    </header>
  );
}

// The caption every KP paper carries: the matter on the left, the case number
// and subject on the right, so a loose sheet still traces back to a case.
function Caption({
  complainant,
  respondent,
  reference,
  subject,
}: {
  complainant: string;
  respondent: string;
  reference: string;
  subject: string;
}) {
  const { t } = useT();
  return (
    <table className="mt-4 w-full border-collapse break-inside-avoid text-left text-[13px]">
      <tbody>
        <tr>
          <td className="w-[58%] align-top">
            <p className="font-semibold">{t("docCaptionIntro")}</p>
            <p className="mt-2 pl-4">{complainant}</p>
            <p className="pl-12 text-xs italic">{t("lblComplainant")},</p>
            <p className="mt-2 pl-12 text-center text-xs font-semibold italic">
              {t("docVersus")}
            </p>
            <p className="mt-2 pl-4">{respondent}</p>
            <p className="pl-12 text-xs italic">{t("lblRespondent")}.</p>
          </td>
          <td className="w-[42%] border-l border-black/25 pl-6 align-top text-[12px]">
            <p>
              {t("docCaseNo")} <span className="font-semibold">{reference}</span>
            </p>
            <p className="mt-1">
              {t("docSubject")}: {subject}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// Doc. No. / Page No. / Series of ___ is the barangay registry stamp, printed
// in the top corner of every KP paper. The series is the year the paper was
// issued; the two numbers are written in when it is entered in the book.
function DocStamp({ series }: { series: number }) {
  const { t } = useT();
  return (
    <table className="mx-auto mt-4 w-full max-w-[130mm] border-collapse break-inside-avoid text-right text-[11px] sm:ml-auto">
      <tbody>
        <tr>
          <td className="w-1/3 border border-black px-2 py-1.5">
            {t("docDocNo")} {FIELD}
          </td>
          <td className="w-1/3 border border-black px-2 py-1.5">
            {t("docPageNo")} {FIELD}
          </td>
          <td className="w-1/3 border border-black px-2 py-1.5">
            {t("docSeriesOf")} {series}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// The served papers print their own acknowledgement, so the paper receipt and
// the system's proof-of-service record meet on one sheet. The office knows who
// served the paper, so that prints; the signature and the hour are the
// respondent's to write.
function Receipt({ serverName }: { serverName: string | null }) {
  const { t } = useT();
  return (
    <div className="mt-6 break-inside-avoid border-t border-black pt-2 text-[11px]">
      <p className="font-semibold uppercase">{t("docReceiptHead")}</p>
      <table className="mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <td className="w-1/2 border-b border-dotted border-black py-2 pr-6 align-bottom">
              {t("docReceivedBy")} {FIELD}
            </td>
            <td className="w-1/2 border-b border-dotted border-black py-2 align-bottom">
              {t("docReceivedWhen")} {FIELD}
            </td>
          </tr>
          <tr>
            <td className="border-b border-dotted border-black py-2 pr-6 align-bottom">
              {t("docServedBy")} {serverName ?? FIELD}
            </td>
            <td className="py-2 align-bottom text-[10px] italic">
              {t("docReceiptNote")}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SignLine({
  label,
  name,
  signatureUrl,
}: {
  label: string;
  name?: string;
  signatureUrl?: string;
}) {
  return (
    <div className="pt-8 text-center">
      {signatureUrl && (
        <img
          src={signatureUrl}
          alt=""
          className="mx-auto mb-1 h-12 object-contain"
        />
      )}
      {name && <p className="text-sm font-bold uppercase">{name}</p>}
      <p className="mx-auto mt-1 w-64 border-t border-black pt-1 text-xs uppercase">
        {label}
      </p>
    </div>
  );
}

// A signature row that straddles a page break leaves an unsigned half on the
// next sheet, so the pair travels whole.
function SignRow({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-wrap justify-between gap-10 break-inside-avoid">
      {children}
    </div>
  );
}

function Paragraph({ children }: { children: ReactNode }) {
  return <p className="indent-8 text-justify">{children}</p>;
}

export default function ComplaintDocument() {
  const { t, lang } = useT();
  const { complaint, settings, generatedAt, generatedBy } =
    useLoaderData() as DocumentLoaderData;
  const { id, doc } = useParams();
  const type = doc as PrintableType;
  const title = t(DOC_TITLE_KEY[type] ?? "doc_summons");

  const locale = lang === "tl" ? "fil-PH" : "en-PH";
  const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { dateStyle: "long" });
  const dateTime = (iso: string) =>
    `${longDate(iso)}, ${new Date(iso).toLocaleTimeString(locale, { timeStyle: "short" })}`;
  const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { timeStyle: "short" });

  useEffect(() => {
    const previous = document.title;
    document.title = `${complaint.reference} - ${title}`;
    return () => {
      document.title = previous;
    };
  }, [complaint.reference, title]);

  // The sitting the party is called to, taken from the case's own bookings: a
  // history entry can carry the date of a session already held.
  const hearingIso = complaint.nextHearingAt;

  // The respondent's place is never borrowed from the complainant's purok — a
  // warrant naming the wrong address is a defect in the service itself.
  const respondentPlace = complaint.respondentAddress;

  const subject = complaintTypeLabel(
    complaint.complaintType,
    complaint.complaintTypeOther,
    t,
  );

  // Mediation belongs to the Punong Barangay, conciliation and arbitration to
  // the Pangkat. The booked session says which, so the notice prints its own
  // box already marked instead of asking the desk to choose.
  const proceeding = complaint.nextHearingKind ?? kindForStatus(complaint.status);
  const mediationBox = proceeding === "mediation" ? "☒" : "☐";
  const conciliationBox = proceeding === "mediation" ? "☐" : "☒";

  const lastService = complaint.serviceRecords[0] ?? null;
  const series = new Date(generatedAt).getFullYear();

  const issuedLine = (
    <Paragraph>
      {t("docIssuedOn")} {longDate(generatedAt)}, {t("docIssuedAt")}{" "}
      {settings.barangayName}, {settings.city}, {t("docCountry")}.
    </Paragraph>
  );

  // RA 7160 §409: the Punong Barangay chairs the Lupon and personally conducts
  // mediation, so the PB signs the mediation papers. The Pangkat only exists once
  // mediation fails, and from there on its own chairman signs (§412) — except
  // under §413(a), where the parties gave the arbitration to the PB alone and
  // the PB signs the award papers too. The mode outlives the stage, so a case
  // closed after a PB arbitration still signs with the PB.
  const pangkatChairman = complaint.pangkatChairman;
  const arbitratedByPb = complaint.arbitrationBy === "punong_barangay";
  const viaPangkat =
    !arbitratedByPb &&
    !!pangkatChairman &&
    (type === "settlement" ||
      type === "cfa" ||
      (type === "notice" &&
        ["conciliation", "arbitration"].includes(complaint.status)));
  const chair = {
    name: viaPangkat ? pangkatChairman ?? settings.punongBarangay : settings.punongBarangay,
    label: viaPangkat
      ? t("lblPangkatChairman")
      : settings.punongTitle || t("lblPunongBarangay"),
    signatureUrl: viaPangkat ? undefined : settings.punongSignatureUrl,
  };
  const secretary = {
    name: settings.secretaryName,
    label: settings.secretaryTitle || t("lblSecretary"),
    signatureUrl: settings.secretarySignatureUrl,
  };
  const pangkatMembers = complaint.pangkatMembers.filter(
    (member) => !member.isChairman,
  );

  return (
    <div className="min-h-screen bg-primary/5 py-6 print:bg-white print:py-0">
      {/* Screen-only toolbar */}
      <div className="mx-auto mb-6 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/admin/complaints/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToCase")}
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            {t("printDoc")}
          </Button>
        </div>
      </div>

      {/* The paper */}
      <article className="mx-auto w-full max-w-[210mm] bg-white px-6 py-10 text-[13px] leading-relaxed text-black shadow-sm print:max-w-none print:shadow-none sm:px-[18mm] sm:py-[14mm]">
        <Letterhead settings={settings} />

        {type !== "summary" && <DocStamp series={series} />}

        {type !== "summary" && (
          <Caption
            complainant={complaint.complainantName}
            respondent={complaint.respondentName}
            reference={complaint.reference}
            subject={subject}
          />
        )}

        <h1 className="mt-6 text-center text-base font-bold tracking-wide uppercase">
          {title}
        </h1>

        {type === "summons" && (
          <div className="mt-6 space-y-3">
            <div>
              <p className="font-semibold">
                {t("docTo")}: {complaint.respondentName}
              </p>
              <p className="pl-4">{respondentPlace ?? FIELD}</p>
            </div>

            <Paragraph>
              <span className="mr-2 font-semibold">{t("docGreetings")}</span>
              {t("dSumP1a")}{" "}
              <span className="font-semibold">{complaint.complainantName}</span>
              {t("docDocketedAs")}{" "}
              <span className="font-semibold">{complaint.reference}</span>
              {t("docForSubject")} {subject}
              {t("docCommittedOn")} {longDate(complaint.incidentAt)},{" "}
              {t("docAtPlace")} {complaint.incidentPlace}.
            </Paragraph>

            <Paragraph>
              {t("dSumP2a")} {settings.barangayName}
              {t("docOnDate")}{" "}
              <span className="underline">
                {hearingIso ? longDate(hearingIso) : BLANK}
              </span>
              {t("docAtTime")}{" "}
              <span className="underline">
                {hearingIso ? clock(hearingIso) : BLANK}
              </span>{" "}
              {t("dSumP2b")}
            </Paragraph>

            <Paragraph>
              <span className="mr-2 font-semibold">{t("docWarning")}:</span>
              {t("dSumWarn")}
            </Paragraph>

            {issuedLine}

            <SignRow>
              <div className="w-full max-w-xs">
                <SignLine
                  label={settings.punongTitle || t("lblPunongBarangay")}
                  name={settings.punongBarangay}
                  signatureUrl={settings.punongSignatureUrl}
                />
              </div>
            </SignRow>

            <Receipt serverName={lastService?.serverName ?? null} />
          </div>
        )}

        {type === "notice" && (
          <div className="mt-6 space-y-3">
            <div>
              <p className="font-semibold">
                {t("docTo")}: {complaint.respondentName}, {t("docAnd")}{" "}
                {complaint.complainantName}
              </p>
              <p className="pl-4">{respondentPlace ?? FIELD}</p>
            </div>

            <Paragraph>
              {t("dNotP1a")}{" "}
              <span className="font-semibold">{complaint.reference}</span>
              {t("dNotP1b")} {complaint.complainantName}, {t("docAgainst")}{" "}
              {complaint.respondentName}
              {t("docForSubject")} {subject}
              {t("docOnDate")}{" "}
              <span className="underline">
                {hearingIso ? longDate(hearingIso) : BLANK}
              </span>
              {t("docAtTime")}{" "}
              <span className="underline">
                {hearingIso ? clock(hearingIso) : BLANK}
              </span>
              .
            </Paragraph>

            <div className="ml-8 space-y-1">
              <p className="font-semibold">{t("dNotProceeding")}</p>
              <p>
                {mediationBox} {t("dNotMediation")}
              </p>
              <p>
                {conciliationBox} {t("dNotConciliation")}
              </p>
            </div>

            <Paragraph>
              {t("dNotP2a")} {settings.barangayName}
              {t("dNotP2b")}
            </Paragraph>

            <Paragraph>{t("dNotP3")}</Paragraph>

            {issuedLine}

            <SignRow>
              <SignLine
                label={chair.label}
                name={chair.name}
                signatureUrl={chair.signatureUrl}
              />
              <SignLine
                label={secretary.label}
                name={secretary.name}
                signatureUrl={secretary.signatureUrl}
              />
            </SignRow>

            <Receipt serverName={lastService?.serverName ?? null} />
          </div>
        )}

        {type === "settlement" && (
          <div className="mt-6 space-y-3">
            <Paragraph>
              <span className="font-semibold">{t("dSetKnow")}</span>{" "}
              {t("dSetIntro")}
            </Paragraph>

            <ol className="ml-10 list-decimal space-y-2 text-justify">
              <li>{t("dSetRecital1")}</li>
              <li>
                {t("dSetRecital2a")} {subject}
                {t("docDocketedAs")} {complaint.reference}
                {t("docCommittedOn")} {longDate(complaint.incidentAt)},{" "}
                {t("docAtPlace")} {complaint.incidentPlace}.
              </li>
              <li>{t("dSetRecital3")}</li>
            </ol>

            <Paragraph>
              <span className="font-semibold">{t("dSetNow")}</span>{" "}
              {t("dSetAssistedA")}{" "}
              {viaPangkat ? (
                <>
                  {t("dSetAssistedPangkat")}{" "}
                  <span className="font-semibold">{pangkatChairman}</span>
                </>
              ) : (
                <>{t("dSetAssistedPb")}</>
              )}{" "}
              {t("dSetAssistedB")}
            </Paragraph>

            <div className="min-h-40 break-inside-avoid border border-black p-3">
              <p className="mb-2 text-xs font-semibold uppercase">
                {t("dSetTermsHead")}
              </p>
              <p className="mb-3 text-xs italic">{t("dSetTermsHint")}</p>
              <ol className="space-y-8">
                {[1, 2, 3, 4].map((n) => (
                  <li key={n} className="flex items-end gap-3">
                    <span className="font-semibold">{n}.</span>
                    <span className="mb-2 flex-1 border-b border-dotted border-black" />
                  </li>
                ))}
              </ol>
            </div>

            <Paragraph>{t("dSetRead")}</Paragraph>

            <Paragraph>
              {t("dSetWitnessA")} {longDate(generatedAt)}, {t("docAtPlace")}{" "}
              {settings.barangayName}.
            </Paragraph>

            <SignRow>
              <SignLine
                label={t("lblComplainant")}
                name={complaint.complainantName}
              />
              <SignLine
                label={t("lblRespondent")}
                name={complaint.respondentName}
              />
            </SignRow>

            {viaPangkat && pangkatMembers.length > 0 && (
              <div className="mt-10 break-inside-avoid">
                <p className="text-center text-[11px] font-semibold uppercase">
                  {t("pangkatTitle")}
                </p>
                <div className="flex flex-wrap justify-between gap-8">
                  {pangkatMembers.map((member) => (
                    <SignLine
                      key={member.id}
                      label={t("lblPangkatMember")}
                      name={member.fullName}
                    />
                  ))}
                </div>
              </div>
            )}

            <SignRow>
              <SignLine
                label={`${t("lblAttestedBy")}: ${chair.label}`}
                name={chair.name}
                signatureUrl={chair.signatureUrl}
              />
              <SignLine
                label={`${t("lblWitnessedBy")}: ${secretary.label}`}
                name={secretary.name}
                signatureUrl={secretary.signatureUrl}
              />
            </SignRow>
          </div>
        )}

        {type === "cfa" && (
          <div className="mt-6 space-y-3">
            <Paragraph>
              <span className="mr-2 font-semibold">{t("dCfaToWhom")}</span>{" "}
              {t("dCfaP1a")} {subject} {t("dCfaP1b")}{" "}
              <span className="font-semibold">{complaint.complainantName}</span>{" "}
              {t("docAgainst")}{" "}
              <span className="font-semibold">{complaint.respondentName}</span>{" "}
              {t("dCfaP1c")}{" "}
              <span className="font-semibold">{complaint.reference}</span>.
            </Paragraph>

            <Paragraph>{t("dCfaP2")}</Paragraph>

            <div className="ml-8 space-y-2">
              <p>{t("dCfaG1")}</p>
              <p>{t("dCfaG2")}</p>
              <p>{t("dCfaG3")}</p>
              <p>{t("dCfaG4")}</p>
              <p>
                {t("dCfaG5")} {BLANK}
              </p>
            </div>

            <Paragraph>{t("dCfaP3")}</Paragraph>

            {issuedLine}

            {/* The certification issues from the officer who heard the case;
                the secretary notes it for the barangay's file. */}
            <SignRow>
              <SignLine
                label={`${t("cfaCertifiedBy")}: ${chair.label}`}
                name={chair.name}
                signatureUrl={chair.signatureUrl}
              />
              <SignLine
                label={`${t("docNotedBy")}: ${secretary.label}`}
                name={secretary.name}
                signatureUrl={secretary.signatureUrl}
              />
            </SignRow>
          </div>
        )}

        {type === "summary" && (
          <CaseSummaryReport
            complaint={complaint}
            generatedAt={generatedAt}
            generatedBy={generatedBy}
          />
        )}
      </article>

      {/* A record that spills onto a second sheet no longer gets the browser's
          page marks, so the paper prints its own line on every page. */}
      <div className="fixed inset-x-0 bottom-0 hidden items-baseline justify-between px-[18mm] pb-[6mm] text-[10px] print:flex">
        <span>
          {complaint.reference} — {title}
        </span>
        <span>
          {t("sumGeneratedOn")} {dateTime(generatedAt)}
        </span>
      </div>
    </div>
  );
}
