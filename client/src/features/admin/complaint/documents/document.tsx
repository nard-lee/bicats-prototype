import { useEffect, type ReactNode } from "react";
import { Link, useLoaderData, useParams } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, type Key } from "@/lib/I18n";
import type { DocumentLoaderData, DocumentType } from "./loader";
import type { BarangaySettings } from "@/features/admin/setting/loader";
import { complaintTypeLabel } from "../type-label";

const DOC_TITLE_KEY: Record<DocumentType, Key> = {
  summons: "doc_summons",
  notice: "doc_notice",
  settlement: "doc_settlement",
  cfa: "doc_cfa",
};

const BLANK = "_____________________";

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
    <div className="pt-10 text-center">
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

function Paragraph({ children }: { children: ReactNode }) {
  return <p className="indent-8 text-justify">{children}</p>;
}

export default function ComplaintDocument() {
  const { t, lang } = useT();
  const { complaint, settings, generatedAt } = useLoaderData() as DocumentLoaderData;
  const { id, doc } = useParams();
  const type = doc as DocumentType;
  const title = t(DOC_TITLE_KEY[type] ?? "doc_summons");

  const locale = lang === "tl" ? "fil-PH" : "en-PH";
  const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { dateStyle: "long" });
  const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { timeStyle: "short" });

  useEffect(() => {
    const previous = document.title;
    document.title = `${complaint.reference} - ${title}`;
    return () => {
      document.title = previous;
    };
  }, [complaint.reference, title]);

  const hearingIso =
    complaint.history.find((event) => event.hearingAt)?.hearingAt ?? null;

  const respondentPlace =
    complaint.respondentAddress ?? complaint.complainantPurok;

  const issuedLine = (
    <p className="indent-8 text-justify">
      Issued this {longDate(generatedAt)} at {settings.barangayName}, {settings.city},
      Philippines.
    </p>
  );

  return (
    <div className="min-h-screen bg-muted/30 py-6 print:bg-white print:py-0">
      {/* Screen-only toolbar */}
      <div className="mx-auto mb-6 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/admin/complaints/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToCase")}
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          {t("printDoc")}
        </Button>
      </div>

      {/* The paper */}
      <article className="mx-auto w-full max-w-[210mm] bg-white px-6 py-10 text-[13px] leading-relaxed text-black shadow-sm print:max-w-none print:shadow-none sm:px-[18mm] sm:py-[14mm]">
        <Letterhead settings={settings} />

        <h1 className="mt-8 text-center text-base font-bold tracking-wide uppercase">
          {title}
        </h1>

        {type === "summons" && (
          <div className="mt-8 space-y-4">
            <div>
              <p className="font-semibold">TO: {complaint.respondentName}</p>
              <p className="pl-4">{respondentPlace}</p>
            </div>

            <Paragraph>
              <span className="mr-2 font-semibold">GREETINGS:</span>
              You are hereby summoned to appear before the Punong Barangay in
              connection with the complaint filed by{" "}
              <span className="font-semibold">{complaint.complainantName}</span>,
              docketed as <span className="font-semibold">{complaint.reference}</span>
              , for{" "}
              {complaintTypeLabel(complaint.complaintType, complaint.complaintTypeOther, t)},
              committed on{" "}
              {longDate(complaint.incidentAt)} at {complaint.incidentPlace}.
            </Paragraph>

            <Paragraph>
              You are required to appear at the Barangay Hall,{" "}
              {settings.barangayName}, on{" "}
              <span className="underline">
                {hearingIso ? longDate(hearingIso) : BLANK}
              </span>{" "}
              at{" "}
              <span className="underline">
                {hearingIso ? clock(hearingIso) : BLANK}
              </span>{" "}
              to answer the complaint and to attend the mediation proceedings.
            </Paragraph>

            <Paragraph>
              <span className="font-semibold">IMPORTANT:</span> Please appear
              personally on the date and time stated above. Your failure to appear
              will be recorded and handled in accordance with the applicable
              Katarungang Pambarangay procedures. If you cannot attend for a
              valid reason, promptly inform the Barangay Office.
            </Paragraph>

            {issuedLine}

            <div className="mt-12 max-w-xs">
              <SignLine
                label={settings.punongTitle || t("lblPunongBarangay")}
                name={settings.punongBarangay}
                signatureUrl={settings.punongSignatureUrl}
              />
            </div>
          </div>
        )}

        {type === "notice" && (
          <div className="mt-8 space-y-4">
            <div>
              <p className="font-semibold">
                TO: {complaint.respondentName} and {complaint.complainantName}
              </p>
              <p className="pl-4">{respondentPlace}</p>
            </div>

            <Paragraph>
              You are hereby notified to appear for the scheduled barangay
              proceeding concerning the complaint docketed as{" "}
              <span className="font-semibold">{complaint.reference}</span>, filed
              by {complaint.complainantName} against {complaint.respondentName}{" "}
              for{" "}
              {complaintTypeLabel(complaint.complaintType, complaint.complaintTypeOther, t)},
              on{" "}
              <span className="underline">
                {hearingIso ? longDate(hearingIso) : BLANK}
              </span>{" "}
              at{" "}
              <span className="underline">
                {hearingIso ? clock(hearingIso) : BLANK}
              </span>
              .
            </Paragraph>

            <div className="ml-8 space-y-1">
              <p>Proceeding (select one):</p>
              <p>☐ Mediation before the Punong Barangay</p>
              <p>☐ Conciliation before the Pangkat ng Tagapagkasundo</p>
            </div>

            <Paragraph>
              The proceeding will be held at the Barangay Hall of{" "}
              {settings.barangayName}. Please bring relevant documents and other
              evidence. Parties are generally required to appear personally,
              subject to the exceptions provided by law.
            </Paragraph>

            <Paragraph>
              This proceeding forms part of the Katarungang Pambarangay process
              under Republic Act No. 7160, where barangay conciliation is required
              by law before an action may be filed.
            </Paragraph>

            {issuedLine}

            <div className="mt-12 flex flex-wrap justify-between gap-10">
              <SignLine
                label={settings.punongTitle || t("lblPunongBarangay")}
                name={settings.punongBarangay}
                signatureUrl={settings.punongSignatureUrl}
              />
              <SignLine
                label={settings.luponTitle || t("lblLuponChairman")}
                name={settings.luponChairman}
                signatureUrl={settings.luponSignatureUrl}
              />
            </div>
          </div>
        )}

        {type === "settlement" && (
          <div className="mt-8 space-y-4">
            <table className="w-full border-collapse text-left">
              <tbody>
                <tr>
                  <td className="w-40 py-1 align-top font-semibold">
                    Complainant
                  </td>
                  <td className="py-1">{complaint.complainantName}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top font-semibold">Respondent</td>
                  <td className="py-1">{complaint.respondentName}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top font-semibold">Complaint No.</td>
                  <td className="py-1">{complaint.reference}</td>
                </tr>
              </tbody>
            </table>

            <Paragraph>
              The parties, assisted by the Punong Barangay and the Lupong
              Tagapamayapa, have this day agreed to settle their dispute
              amicably under the following terms and conditions:
            </Paragraph>

            <div className="min-h-40 border border-black p-3">
              <p className="mb-2 text-xs font-semibold uppercase">
                Terms and Conditions of Settlement
              </p>
              <p className="mb-3 text-xs italic">
                Write the specific obligations agreed to by the parties, including
                amounts, dates, manner of payment or performance, and any other
                agreed conditions. Do not use a general status-history note as the
                settlement terms.
              </p>
              <div className="space-y-6">
                <div className="border-b border-dotted border-black" />
                <div className="border-b border-dotted border-black" />
                <div className="border-b border-dotted border-black" />
                <div className="border-b border-dotted border-black" />
              </div>
            </div>

            <Paragraph>
              The parties confirm that they have read or have had the terms
              explained to them in a language or dialect they understand, and that
              they are signing this settlement voluntarily. Its legal effect and
              enforcement are subject to the applicable provisions of Republic Act
              No. 7160, including the rules on repudiation and execution.
            </Paragraph>

            <p className="indent-8">
              IN WITNESS WHEREOF, the parties have signed this Amicable
              Settlement on {longDate(generatedAt)} at {settings.barangayName}.
            </p>

            <div className="mt-12 flex flex-wrap justify-between gap-10">
              <SignLine label={t("lblComplainant")} name={complaint.complainantName} />
              <SignLine label={t("lblRespondent")} name={complaint.respondentName} />
            </div>

            <div className="mt-10 max-w-xs">
              <SignLine
                label={t("lblAttestedBy")}
                name={settings.punongBarangay}
                signatureUrl={settings.punongSignatureUrl}
              />
            </div>
          </div>
        )}

        {type === "cfa" && (
          <div className="mt-8 space-y-4">
            <Paragraph>
              <span className="mr-2 font-semibold">TO WHOM IT MAY CONCERN:</span>
              This is to certify that a complaint for{" "}
              {complaintTypeLabel(complaint.complaintType, complaint.complaintTypeOther, t)} was
              filed by{" "}
              <span className="font-semibold">{complaint.complainantName}</span>{" "}
              against{" "}
              <span className="font-semibold">{complaint.respondentName}</span>{" "}
              before this Office, docketed as{" "}
              <span className="font-semibold">{complaint.reference}</span>.
            </Paragraph>

            <Paragraph>
              The records of this Office show that the applicable Katarungang
              Pambarangay proceedings for this dispute were conducted and that
              the ground supporting this certification is the following (the
              issuing officer must select and complete the applicable ground):
            </Paragraph>

            <div className="ml-8 space-y-2">
              <p>☐ No amicable settlement was reached before the Punong Barangay.</p>
              <p>☐ No amicable settlement was reached before the Pangkat ng Tagapagkasundo.</p>
              <p>☐ An amicable settlement was repudiated on a ground and in the manner provided by law.</p>
              <p>☐ Other legally applicable ground: {BLANK}</p>
            </div>

            <Paragraph>
              This certification is issued pursuant to Section 412 of Republic
              Act No. 7160, otherwise known as the Local Government Code of 1991,
              only upon verification that the legal and procedural requirements
              for its issuance have been satisfied. It is intended to support the
              filing of the appropriate action with the proper court or
              government office, as applicable.
            </Paragraph>

            {issuedLine}

            <div className="mt-12 flex flex-wrap justify-between gap-10">
              <SignLine
                label="Certified by: Lupon Secretary / Pangkat Secretary"
              />
              <SignLine
                label="Attested by: Punong Barangay / Pangkat Chairperson"
              />
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
