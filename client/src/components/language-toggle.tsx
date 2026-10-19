import { useT, type Lang } from "@/lib/I18n";

export default function LanguageToggle() {
  const { lang, setLang } = useT();

  return (
    <div className="flex overflow-hidden rounded-md border text-xs font-medium">
      {(["tl", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1.5 ${lang === l
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
