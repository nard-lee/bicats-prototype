import { cn } from "cn";
import { useT } from "@/lib/I18n";
import FieldError from "./field-error";
import type { SectionProps } from "./types";

// Names of the palettes, not phrases, so they stay as written in both languages.
// The dot is the accent each palette paints with in light mode, measured from
// the html[data-theme] blocks in index.css.
const PALETTES = [
  { id: "kalachuchi", name: "Kalachuchi", swatch: "#bb4d00" },
  { id: "pine", name: "Pino", swatch: "#137d41" },
  { id: "gabi", name: "Gabi", swatch: "#624bbc" },
  { id: "langit", name: "Langit", swatch: "#0f74a2" },
  { id: "bato", name: "Bato", swatch: "#57637e" },
] as const;

// Tucked under the letterhead preview rather than given its own settings block:
// the accent is set once and left alone, so the control stays quiet and lives
// beside the one panel that actually shows what a colour does to a document.
export default function ThemeSection({ values, fields, update }: SectionProps) {
  const { t } = useT();

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={t("settingsTheme")}
        className="flex items-center justify-center gap-2.5"
      >
        {PALETTES.map(({ id, name, swatch }) => {
          const checked = values.theme === id;
          return (
            <label
              key={id}
              title={name}
              className="relative flex cursor-pointer items-center"
            >
              <input
                type="radio"
                name="theme"
                value={id}
                checked={checked}
                onChange={() => update("theme", id)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "size-3.5 rounded-full transition-opacity peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-focus-visible:ring-foreground/40",
                  checked
                    ? "opacity-100 ring-1 ring-foreground/60 ring-offset-1 ring-offset-card"
                    : "opacity-40 hover:opacity-75",
                )}
                style={{ backgroundColor: swatch }}
              />
              <span className="sr-only">{name}</span>
            </label>
          );
        })}
      </div>
      <FieldError message={fields.theme} />
    </div>
  );
}
