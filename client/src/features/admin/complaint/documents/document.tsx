import { useEffect, type ReactNode } from "react";
import { Link, useLoaderData, useParams } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, type Key } from "@/lib/I18n";
import type { DocumentLoaderData, DocumentType } from "./loader";

// Prototype placeholder officials. Replace with real signatories later.
const OFFICIALS = {
  punongBarangay: "Hon. Mario D. Santos",
  luponChairman: "Mr. Pedro A. Reyes",
};

const DOC_TITLE_KEY: Record<DocumentType, Key> = {
  summons: "doc_summons",
  notice: "doc_notice",
  settlement: "doc_settlement",
  cfa: "doc_cfa",
};

const BLANK = "_____________________";

function Letterhead() {
  const { t } = useT();
  return (
    <header className="border-b-2 border-black pb-3 text-center">
      <p className="text-xs tracking-wide uppercase">{t("republic")}</p>
      <p className="text-sm font-semibold tracking-wide uppercase">{t("city")}</p>
      <p className="text-base font-bold tracking-wide uppercase">
        Barangay Kabayanihan
      </p>
      <p className="text-xs tracking-wide uppercase">
        Office of the Punong Barangay
      </p>
    </header>
  );
}

function SignLine({ label, name }: { label: string; name?: string }) {
  return (
    <div className="pt-10 text-center">
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
  const { complaint, generatedAt } = useLoaderData() as DocumentLoaderData;
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
      Issued this {longDate(generatedAt)} at Barangay Kabayanihan, {t("city")},
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
        <Letterhead />

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
              , for {t(complaint.complaintType as Key)}, committed on{" "}
              {longDate(complaint.incidentAt)} at {complaint.incidentPlace}.
            </Paragraph>

            <Paragraph>
              You are required to appear at the Barangay Hall, Barangay
              Kabayanihan, on{" "}
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
              <span className="font-semibold">FAILURE TO APPEAR</span> at the
              scheduled mediation without justifiable cause may be construed as a
              waiver of your right to be heard and the case may proceed in your
              absence.
            </Paragraph>

            {issuedLine}

            <div className="mt-12 max-w-xs">
              <SignLine label={t("lblPunongBarangay")} name={OFFICIALS.punongBarangay} />
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
              You are hereby notified that the mediation/conciliation of the
              complaint docketed as{" "}
              <span className="font-semibold">{complaint.reference}</span>, filed
              by {complaint.complainantName} against {complaint.respondentName}{" "}
              for {t(complaint.complaintType as Key)}, is set for mediation on{" "}
              <span className="underline">
                {hearingIso ? longDate(hearingIso) : BLANK}
              </span>{" "}
              at{" "}
              <span className="underline">
                {hearingIso ? clock(hearingIso) : BLANK}
              </span>
              .
            </Paragraph>

            <Paragraph>
              The mediation shall be held at the Barangay Hall, Barangay
              Kabayanihan. The parties are advised to bring any documents,
              witnesses, or evidence relevant to the case. Only the parties
              themselves, or their duly authorized representatives, may appear.
            </Paragraph>

            <Paragraph>
              This proceeding is part of the Katarungang Pambarangay process
              required by Republic Act No. 7160 before a case may be filed in
              court.
            </Paragraph>

            {issuedLine}

            <div className="mt-12 flex flex-wrap justify-between gap-10">
              <SignLine label={t("lblPunongBarangay")} name={OFFICIALS.punongBarangay} />
              <SignLine label={t("lblLuponChairman")} name={OFFICIALS.luponChairman} />
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

            <div className="min-h-24 border border-black p-3">
              {complaint.history.find((event) => event.note)?.note ?? (
                <span className="text-neutral-400">— terms —</span>
              )}
            </div>

            <Paragraph>
              The parties hereby acknowledge that this Amicable Settlement is
              binding upon them and may be enforced as provided for by law.
            </Paragraph>

            <p className="indent-8">
              IN WITNESS WHEREOF, the parties have signed this Amicable
              Settlement on {longDate(generatedAt)} at Barangay Kabayanihan.
            </p>

            <div className="mt-12 flex flex-wrap justify-between gap-10">
              <SignLine label={t("lblComplainant")} name={complaint.complainantName} />
              <SignLine label={t("lblRespondent")} name={complaint.respondentName} />
            </div>

            <div className="mt-10 max-w-xs">
              <SignLine label={t("lblAttestedBy")} name={OFFICIALS.punongBarangay} />
            </div>
          </div>
        )}

        {type === "cfa" && (
          <div className="mt-8 space-y-4">
            <Paragraph>
              <span className="mr-2 font-semibold">TO WHOM IT MAY CONCERN:</span>
              This is to certify that a complaint for{" "}
              {t(complaint.complaintType as Key)} was filed by{" "}
              <span className="font-semibold">{complaint.complainantName}</span>{" "}
              against{" "}
              <span className="font-semibold">{complaint.respondentName}</span>{" "}
              before this Office, docketed as{" "}
              <span className="font-semibold">{complaint.reference}</span>.
            </Paragraph>

            <Paragraph>
              That the parties failed to amicably settle their dispute despite
              the mediation and conciliation proceedings conducted under the
              Katarungang Pambarangay, and no settlement was reached.
            </Paragraph>

            <Paragraph>
              This certification is issued pursuant to Section 412 of Republic
              Act No. 7160, otherwise known as the Local Government Code of
              1991, to enable the complainant to file the appropriate action in
              court.
            </Paragraph>

            {issuedLine}

            <div className="mt-12 flex flex-wrap justify-between gap-10">
              <SignLine label={t("lblPunongBarangay")} name={OFFICIALS.punongBarangay} />
              <SignLine label={t("lblLuponChairman")} name={OFFICIALS.luponChairman} />
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
