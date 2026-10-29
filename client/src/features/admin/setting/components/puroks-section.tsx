import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/I18n";
import FieldError from "./field-error";
import type { SectionProps } from "./types";

export default function PuroksSection({
  values,
  fields,
  update,
}: SectionProps) {
  const { t } = useT();
  const [purok, setPurok] = useState("");

  function addPurok() {
    const name = purok.trim();
    if (!name || values.puroks.includes(name)) return;
    update("puroks", [...values.puroks, name]);
    setPurok("");
  }

  function removePurok(name: string) {
    update(
      "puroks",
      values.puroks.filter((entry) => entry !== name),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("settingsPuroks")}
        </CardTitle>
        <CardDescription>{t("puroksHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          <Label>{t("puroksLabel")}</Label>
          {values.puroks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noPuroks")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {values.puroks.map((name) => (
                <Badge key={name} variant="secondary" className="gap-1 pr-1">
                  {name}
                  <button
                    type="button"
                    onClick={() => removePurok(name)}
                    aria-label={`${t("removePurok")} ${name}`}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={purok}
              onChange={(event) => setPurok(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPurok();
                }
              }}
              maxLength={60}
              className="h-11 w-full sm:w-[240px]"
              aria-label={t("addPurok")}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addPurok}
              disabled={!purok.trim()}
            >
              <Plus className="mr-2 size-4" />
              {t("addPurok")}
            </Button>
          </div>
          <FieldError message={fields.puroks} />
          <p className="text-sm text-muted-foreground">{t("puroksNote")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
