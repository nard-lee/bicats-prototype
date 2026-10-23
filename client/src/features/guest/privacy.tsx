import { useT, type Key } from "@/lib/I18n";

const sections: { title: Key; text: Key }[] = [
  { title: "privacyWhoTitle", text: "privacyWhoText" },
  { title: "privacyCollectTitle", text: "privacyCollectText" },
  { title: "privacyUseTitle", text: "privacyUseText" },
  { title: "privacyShareTitle", text: "privacyShareText" },
  { title: "privacyCookiesTitle", text: "privacyCookiesText" },
  { title: "privacyRetentionTitle", text: "privacyRetentionText" },
  { title: "privacyRightsTitle", text: "privacyRightsText" },
  { title: "privacyChangesTitle", text: "privacyChangesText" },
];

export default function Privacy() {
  const { t } = useT();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("privacyTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("privacyUpdated")}</p>
      <p className="mt-6 leading-relaxed text-muted-foreground">
        {t("privacyIntro")}
      </p>

      <div className="mt-8 space-y-7">
        {sections.map(({ title, text }) => (
          <section key={title}>
            <h2 className="text-lg font-semibold tracking-tight">{t(title)}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {t(text)}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
