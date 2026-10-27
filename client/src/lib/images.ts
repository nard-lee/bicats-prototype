const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.85;
const RECOMPRESS_ABOVE = 500 * 1024;

const RASTER_TYPES = new Set(["image/jpeg", "image/png"]);

async function shrinkImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // JPEG has no alpha channel, so flatten transparent PNGs onto white.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

// Phone photos arrive at several megabytes; re-encoding in the browser keeps
// uploads and evidence views small without changing the accepted file types.
export async function compressEvidenceImage(file: File): Promise<File> {
  if (!RASTER_TYPES.has(file.type)) return file;
  if (file.size <= RECOMPRESS_ABOVE) return file;

  try {
    return await shrinkImage(file);
  } catch {
    return file;
  }
}

export async function compressEvidence(form: FormData): Promise<void> {
  const files = form.getAll("evidence").filter((v): v is File => v instanceof File);
  if (!files.length) return;

  const shrunk = await Promise.all(files.map(compressEvidenceImage));
  if (shrunk.every((file, index) => file === files[index])) return;

  form.delete("evidence");
  for (const file of shrunk) form.append("evidence", file);
}
