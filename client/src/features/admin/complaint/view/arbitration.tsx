import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT, type Key } from "@/lib/I18n";
import type { ComplaintDetail } from "./loader";

// RA 7160 §413: the parties may agree in writing to arbitration, and they pick
// the arbiter when they do. Both facts are set on the move into the stage, so
// this card only ever appears once one of them exists.
export default function ArbitrationCard({
  complaint,
}: {
  complaint: ComplaintDetail;
}) {
  const { t, lang } = useT();
  const mode = complaint.arbitrationBy;
  if (!mode) return null;

  const agreementAt = complaint.arbitrationAgreementAt
    ? new Date(complaint.arbitrationAgreementAt).toLocaleDateString(
        lang === "tl" ? "fil-PH" : "en-PH",
        { dateStyle: "medium" },
      )
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("arbTitle")}</CardTitle>
        <CardDescription>{t("arbDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted-foreground">{t("arbHears")}</p>
          <p className="text-sm font-medium">{t(`arbBy_${mode}` as Key)}</p>
        </div>
        {agreementAt && (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t("arbAgreedOn")}</p>
            <p className="text-sm font-medium">{agreementAt}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
