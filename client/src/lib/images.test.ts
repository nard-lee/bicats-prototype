import { describe, expect, it } from "vitest";
import { compressEvidence, compressEvidenceImage } from "./images";

function file(name: string, type: string, bytes: number) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("compressEvidence", () => {
  it("leaves non-images and small images untouched", async () => {
    const pdf = file("scan.pdf", "application/pdf", 600 * 1024);
    const small = file("small.jpg", "image/jpeg", 120 * 1024);

    expect(await compressEvidenceImage(pdf)).toBe(pdf);
    expect(await compressEvidenceImage(small)).toBe(small);
  });

  it("falls back to the original when the image cannot be decoded", async () => {
    const big = file("photo.jpg", "image/jpeg", 800 * 1024);
    expect(await compressEvidenceImage(big)).toBe(big);
  });

  it("leaves the form untouched when every file passes through", async () => {
    const form = new FormData();
    const pdf = file("scan.pdf", "application/pdf", 600 * 1024);
    const small = file("small.png", "image/png", 90 * 1024);
    form.append("evidence", pdf);
    form.append("evidence", small);

    await compressEvidence(form);

    expect(form.getAll("evidence")).toEqual([pdf, small]);
  });
});
