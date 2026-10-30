import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/I18n";
import FieldError from "./field-error";
import Group from "./group";
import type { SectionProps } from "./types";

// One entry per official, stored as "Name — Position" so the published roster
// keeps the order the barangay lists them in.
function formatEntry(name: string, position: string) {
  return position ? `${name} — ${position}` : name;
}

export default function OfficialsSection({
  values,
  fields,
  update,
}: SectionProps) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");

  const roster = values.officials;

  function addOfficial() {
    const person = name.trim();
    if (!person) return;

    const next = formatEntry(person, position.trim());
    if (!roster.includes(next)) update("officials", [...roster, next]);
    setName("");
    setPosition("");
  }

  function removeOfficial(official: string) {
    update(
      "officials",
      roster.filter((entry) => entry !== official),
    );
  }

  return (
    <Group title={t("settingsOfficials")} hint={t("officialsHint")}>
      <div className="space-y-3">
        <Label>{t("officialsLabel")}</Label>
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOfficials")}</p>
        ) : (
          <ul className="divide-y">
            {roster.map((official) => (
              <li
                key={official}
                className="flex items-center justify-between gap-4 py-2"
              >
                <span className="text-sm">{official}</span>
                <button
                  type="button"
                  onClick={() => removeOfficial(official)}
                  aria-label={`${t("removeOfficial")} ${official}`}
                  className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addOfficial();
              }
            }}
            maxLength={120}
            placeholder={t("fullName")}
            aria-label={t("fullName")}
            className="h-11 min-w-0 grow"
          />
          <Input
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addOfficial();
              }
            }}
            maxLength={60}
            placeholder={t("position")}
            aria-label={t("position")}
            className="h-11 min-w-0 grow"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addOfficial}
            disabled={!name.trim()}
            className="h-11 shrink-0"
          >
            {t("addOfficial")}
          </Button>
        </div>
        <FieldError message={fields.officials} />
        <p className="text-sm text-muted-foreground">{t("officialsNote")}</p>
      </div>
    </Group>
  );
}
