import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/I18n";
import type { Values } from "./types";

export default function LetterheadPreview({ values }: { values: Values }) {
  const { t } = useT();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("settingsPreview")}</CardTitle>
        <CardDescription>{t("settingsLetterhead")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-white p-4 text-center text-black">
          {values.logoUrl && (
            <img
              src={values.logoUrl}
              alt=""
              className="mx-auto mb-2 size-12 object-contain"
            />
          )}
          <p className="text-[10px] tracking-wide uppercase">{t("republic")}</p>
          <p className="text-[11px] font-semibold tracking-wide uppercase">
            {[values.province, values.city].filter(Boolean).join(" · ")}
          </p>
          <p className="text-sm font-bold tracking-wide uppercase">
            {values.barangayName || "—"}
          </p>
          <p className="mt-1 text-[10px] tracking-wide uppercase">
            {values.documentOfficeLine || "—"}
          </p>
        </div>

        <div className="mt-4 flex justify-between gap-3 text-center">
          <div className="flex-1">
            {values.punongSignatureUrl && (
              <img
                src={values.punongSignatureUrl}
                alt=""
                className="mx-auto h-8 object-contain"
              />
            )}
            <p className="text-xs font-semibold uppercase">
              {values.punongBarangay || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {values.punongTitle}
            </p>
          </div>
          <div className="flex-1">
            {values.secretarySignatureUrl && (
              <img
                src={values.secretarySignatureUrl}
                alt=""
                className="mx-auto h-8 object-contain"
              />
            )}
            <p className="text-xs font-semibold uppercase">
              {values.secretaryName || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {values.secretaryTitle}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
