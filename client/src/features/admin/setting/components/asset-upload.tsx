import { useRef, useState, type ChangeEvent } from "react";
import { Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useT } from "@/lib/I18n";

async function readError(err: unknown): Promise<string> {
  const response = (err as { response?: Response })?.response;
  if (response) {
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      return data.error ?? data.message ?? "Something went wrong.";
    } catch {
      /* fall through */
    }
  }
  return "Something went wrong.";
}

export default function AssetUpload({
  label,
  hint,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  readOnly?: boolean;
}) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await api
        .post("settings/upload", { body })
        .json<{ url: string }>();
      onChange(result.url);
      toast.success(t("imageUploaded"));
    } catch (err) {
      toast.error(await readError(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              {uploading
                ? t("saving")
                : value
                  ? t("replaceImage")
                  : t("uploadImage")}
            </Button>
          )}
          {value && !readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
            >
              {t("removeImage")}
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}
