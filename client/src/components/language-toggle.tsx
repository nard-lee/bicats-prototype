import { useT, type Lang } from "@/lib/I18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A language names itself, so the two options stay untranslated on purpose.
const LANGUAGES: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "English" },
  { value: "tl", label: "Filipino" },
];

export default function LanguageToggle() {
  const { lang, setLang, t } = useT();

  return (
    <Select value={lang} onValueChange={(value) => setLang(value as Lang)}>
      <SelectTrigger
        size="sm"
        className="w-[7.25rem]"
        aria-label={t("language")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((language) => (
          <SelectItem key={language.value} value={language.value}>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
