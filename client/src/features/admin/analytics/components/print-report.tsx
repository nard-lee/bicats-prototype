import { useT, type Key } from "@/lib/I18n";
import type { DigestData } from "./types";

type PrintReportProps = {
  scopeLabel: string;
  digest: DigestData | null;
  digestRows: [string, string][];
};

export default function PrintReport({ scopeLabel, digest, digestRows }: PrintReportProps) {
  const { t } = useT();

  return (
    <article className="mx-auto hidden w-full max-w-[210mm] bg-white px-[18mm] py-[14mm] text-black print:block">
      <h1 className="text-center text-sm font-bold tracking-wide uppercase">
        {t("adminAnalytics")}
      </h1>
      <p className="mt-1 text-center text-xs">{scopeLabel}</p>

      {digest && (
        <table className="mt-8 w-full border-collapse text-[13px]">
          <tbody>
            {digestRows.map(([label, value]) => (
              <tr key={label} className="border-b border-black/20 align-top">
                <td className="w-1/2 px-1 py-1.5 pr-4">{label}</td>
                <td className="px-1 py-1.5 text-right font-semibold">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {digest && (
        <div className="mt-10 grid grid-cols-2 gap-12">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase">{t("anDigestByType")}</p>
            <table className="w-full border-collapse text-[13px]">
              <tbody>
                {digest.filed.byType.map((item) => (
                  <tr key={item.complaintType} className="border-b border-black/20">
                    <td className="px-1 py-1">
                      {t(item.complaintType as Key) || item.complaintType}
                    </td>
                    <td className="px-1 py-1 text-right">{item._count.complaintType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase">{t("anTopPurok")}</p>
            <table className="w-full border-collapse text-[13px]">
              <tbody>
                {digest.filed.byPurok.map((item) => (
                  <tr key={item.complainantPurok} className="border-b border-black/20">
                    <td className="px-1 py-1">{item.complainantPurok}</td>
                    <td className="px-1 py-1 text-right">{item._count.complainantPurok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}
