import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import zlib from "node:zlib";
import { faker } from "@faker-js/faker";

// Evidence files have to be real enough to open, so they are generated here
// rather than pointed at a missing path. Shared by both seeders.
const UPLOAD_DIR = path.resolve("uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function makePng(width: number, height: number, color: { r: number; g: number; b: number }): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB

  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3;
      raw[p] = color.r;
      raw[p + 1] = color.g;
      raw[p + 2] = color.b;
    }
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makePdf(lines: string[]): Buffer {
  const content = `BT /F1 12 Tf 20 180 Td 14 TL ${lines
    .map((line, i) => `${i ? "T* " : ""}(${line.replace(/[()\\]/g, "")}) Tj`)
    .join(" ")} ET`;
  const stream = Buffer.from(content, "latin1");

  const objects: Array<() => Buffer> = [
    () => Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    () => Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    () =>
      Buffer.from(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      ),
    () =>
      Buffer.concat([
        Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),
        stream,
        Buffer.from("\nendstream"),
      ]),
    () => Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
  ];

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [];
  let size = chunks[0]!.length;

  objects.forEach((factory, i) => {
    offsets[i] = size;
    const head = Buffer.from(`${i + 1} 0 obj\n`);
    const body = factory();
    const tail = Buffer.from("\nendobj\n");
    chunks.push(head, body, tail);
    size += head.length + body.length + tail.length;
  });

  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "latin1"));

  return Buffer.concat(chunks);
}

const PHOTO_COLORS = [
  { r: 190, g: 60, b: 60 },
  { r: 60, g: 120, b: 190 },
  { r: 70, g: 160, b: 110 },
  { r: 200, g: 150, b: 60 },
  { r: 140, g: 90, b: 180 },
  { r: 90, g: 90, b: 90 },
];

export interface FakeEvidence {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

export async function makeEvidence(
  count: number = faker.number.int({ min: 1, max: 3 }),
): Promise<FakeEvidence[]> {
  const rows: FakeEvidence[] = [];

  for (let i = 0; i < count; i++) {
    const asPdf = faker.number.int({ min: 0, max: 9 }) < 3;

    if (asPdf) {
      const storedName = `${randomUUID()}.pdf`;
      const buffer = makePdf([
        "Barangay Kabayanihan",
        "Supporting document",
        faker.lorem.words(5),
      ]);
      await fs.promises.writeFile(path.join(UPLOAD_DIR, storedName), buffer);
      rows.push({
        originalName: `${faker.word.noun()}-${faker.number.int({ min: 1, max: 99 })}.pdf`,
        storedName,
        mimeType: "application/pdf",
        size: buffer.length,
      });
    } else {
      const storedName = `${randomUUID()}.png`;
      const buffer = makePng(480, 360, faker.helpers.arrayElement(PHOTO_COLORS));
      await fs.promises.writeFile(path.join(UPLOAD_DIR, storedName), buffer);
      rows.push({
        originalName: `IMG_${faker.string.alphanumeric(6).toUpperCase()}.png`,
        storedName,
        mimeType: "image/png",
        size: buffer.length,
      });
    }
  }

  return rows;
}
