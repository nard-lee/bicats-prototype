import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomInt, randomUUID } from "node:crypto";
import zlib from "node:zlib";
import { prisma } from "../src/db";
import { faker } from "@faker-js/faker";

const COMPLAINT_TYPES = [
  "type1", "type2", "type3", "type4", "type5", "type6",
  "type7", "type8", "type9", "type10", "type11", "type12",
];

// Fallback when the settings row has not been created yet.
// The Punong Barangay issues the summons by the next working day.
const RECEIVED_DEADLINE_DAYS = 1;
const SUMMONED_DEADLINE_DAYS = 5;
const MEDIATION_DEADLINE_DAYS = 30;
const CONCILIATION_DEADLINE_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

const UPLOAD_DIR = path.resolve("uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Minimal PNG / PDF generators so seeded evidence actually renders.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fake evidence
// ---------------------------------------------------------------------------

const PHOTO_COLORS = [
  { r: 190, g: 60, b: 60 },
  { r: 60, g: 120, b: 190 },
  { r: 70, g: 160, b: 110 },
  { r: 200, g: 150, b: 60 },
  { r: 140, g: 90, b: 180 },
  { r: 90, g: 90, b: 90 },
];

interface FakeEvidence {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

async function makeEvidence(): Promise<FakeEvidence[]> {
  const count = faker.number.int({ min: 1, max: 3 });
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

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Starting seed with Faker...");

  // Clean up existing data (Evidence/ServiceRecords cascade from Complaint).
  // Staff accounts, their sessions, notices and settings are kept.
  await prisma.notification.deleteMany();
  await prisma.hearing.deleteMany();
  await prisma.statusUpdate.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.auditLog.deleteMany();

  // Start the demo dataset from BK-<year>-000001 again.
  const year = new Date().getFullYear();
  await prisma.referenceCounter.upsert({
    where: { year },
    update: { lastValue: 0 },
    create: { year, lastValue: 0 },
  });

  // Same alphabet as complaint.service for the public check suffix.
  const CHECK_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const checkSuffix = () =>
    CHECK_ALPHABET.charAt(randomInt(CHECK_ALPHABET.length)) +
    CHECK_ALPHABET.charAt(randomInt(CHECK_ALPHABET.length));

  const settings = await prisma.barangaySettings.findUnique({
    where: { id: 1 },
    select: {
      deadlineReceived: true,
      deadlineSummoned: true,
      deadlineMediation: true,
      deadlineConciliation: true,
    },
  });
  const deadlineDays = {
    received: settings?.deadlineReceived ?? RECEIVED_DEADLINE_DAYS,
    summoned: settings?.deadlineSummoned ?? SUMMONED_DEADLINE_DAYS,
    mediation: settings?.deadlineMediation ?? MEDIATION_DEADLINE_DAYS,
    conciliation:
      settings?.deadlineConciliation ?? CONCILIATION_DEADLINE_DAYS,
  };

  // ---- Lupon roster, kept across reseeds so staff edits survive ----
  const rosterSelect = { id: true, fullName: true } as const;
  let roster = await prisma.luponMember.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
    select: rosterSelect,
  });

  if (roster.length === 0) {
    await prisma.luponMember.createMany({
      data: [
        { fullName: "Elena Bautista", contact: "0917 555 0101" },
        { fullName: "Ramon Salazar", contact: "0917 555 0102" },
        { fullName: "Cecilia Dizon", contact: "0917 555 0103" },
        { fullName: "Ferdinand Ocampo", contact: "0917 555 0104" },
        { fullName: "Gloria Villanueva", contact: "0917 555 0105" },
        { fullName: "Nestor Aquino", contact: "0917 555 0106" },
      ],
    });
    roster = await prisma.luponMember.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: rosterSelect,
    });
    console.log(`✅ Seeded ${roster.length} Lupon members.`);
  }

  let sequence = 0;

  // One case per lifecycle stage so every screen (list, calendar, mediation,
  // reports) has something real to show.
  type SeedPlan = {
    status:
      | "received"
      | "summoned"
      | "mediation"
      | "conciliation"
      | "settled"
      | "certified";
    ageDays: number; // how long ago the complaint was filed
  };

  const plan: SeedPlan[] = [
    { status: "received", ageDays: 0 },
    { status: "summoned", ageDays: 4 },
    { status: "mediation", ageDays: 12 },
    { status: "conciliation", ageDays: 22 },
    { status: "settled", ageDays: 30 },
    { status: "certified", ageDays: 45 },
  ];

  const TERMINAL = ["settled", "certified", "dismissed"];
  const NOW = new Date();

  for (const item of plan) {
    const createdAt = new Date(NOW.getTime() - item.ageDays * DAY_MS);
    const incidentAt = faker.date.between({
      from: new Date(createdAt.getTime() - 365 * DAY_MS),
      to: createdAt,
    });
    const contact = faker.phone.number({ style: "international" });
    const evidence = await makeEvidence();

    sequence += 1;
    const reference = `BK-${year}-${String(sequence).padStart(6, "0")}-${checkSuffix()}`;

    // Roughly three in five cases have already been opened by staff.
    const openedAt =
      faker.number.float({ min: 0, max: 1 }) < 0.6
        ? faker.date.between({ from: createdAt, to: new Date() })
        : null;

    const isTerminal = TERMINAL.includes(item.status);

    // Only cases that reached conciliation carry a Pangkat; mediation itself is
    // handled by the Punong Barangay.
    const panel =
      roster.length >= 3 &&
      ["conciliation", "certified"].includes(item.status)
        ? roster.slice(0, 3).map((member, index) => ({
            id: member.id,
            fullName: member.fullName,
            isChairman: index === 0,
          }))
        : [];

    const updates: {
      status: string;
      publicNote: string | null;
      hearingAt?: Date | null;
      internalNote?: string | null;
      createdAt: Date;
    }[] = [
      {
        status: "received",
        publicNote: "Complaint received and recorded.",
        createdAt,
      },
    ];

    let dueAt: Date | null;

    if (item.status === "mediation") {
      // Walk the case through the real KP steps so the history timeline
      // has several pages of events, not just one.
      const summonedAt = faker.date.between({
        from: new Date(createdAt.getTime() + DAY_MS),
        to: new Date(NOW.getTime() - DAY_MS),
      });
      const mediationStarted = faker.date.between({
        from: summonedAt,
        to: NOW,
      });
      updates.push({
        status: "summoned",
        publicNote: "Respondent was summoned before the Punong Barangay.",
        createdAt: summonedAt,
      });
      updates.push({
        status: "mediation",
        publicNote: "Mediation before the Punong Barangay.",
        createdAt: mediationStarted,
        hearingAt: faker.date.between({
          from: mediationStarted,
          to: new Date(NOW.getTime() + 10 * DAY_MS),
        }),
      });
      dueAt = new Date(mediationStarted.getTime() + deadlineDays.mediation * DAY_MS);
    } else if (item.status === "conciliation") {
      // Mediation before the Punong Barangay failed, so the Pangkat now
      // handles the conciliation stage.
      const summonedAt = faker.date.between({
        from: new Date(createdAt.getTime() + DAY_MS),
        to: new Date(NOW.getTime() - 3 * DAY_MS),
      });
      const mediationStarted = faker.date.between({
        from: summonedAt,
        to: new Date(NOW.getTime() - 2 * DAY_MS),
      });
      const conciliationStarted = faker.date.between({
        from: mediationStarted,
        to: new Date(NOW.getTime() - DAY_MS),
      });
      updates.push({
        status: "summoned",
        publicNote: "Respondent was summoned before the Punong Barangay.",
        createdAt: summonedAt,
      });
      updates.push({
        status: "mediation",
        publicNote: "Mediation before the Punong Barangay.",
        createdAt: mediationStarted,
        hearingAt: mediationStarted,
      });
      updates.push({
        status: "conciliation",
        publicNote: "Conciliation before the Pangkat ng Tagapagkasundo.",
        createdAt: conciliationStarted,
        hearingAt: faker.date.between({
          from: conciliationStarted,
          to: new Date(NOW.getTime() + 10 * DAY_MS),
        }),
      });
      dueAt = new Date(
        conciliationStarted.getTime() + deadlineDays.conciliation * DAY_MS,
      );
    } else if (item.status === "summoned") {
      const summonedAt = faker.date.between({
        from: new Date(createdAt.getTime() + DAY_MS / 2),
        to: NOW,
      });
      updates.push({
        status: "summoned",
        publicNote: "Respondent was summoned before the Punong Barangay.",
        createdAt: summonedAt,
      });
      dueAt = new Date(summonedAt.getTime() + deadlineDays.summoned * DAY_MS);
    } else if (isTerminal) {
      // Resolved cases no longer carry a deadline.
      const summonedAt = faker.date.between({
        from: new Date(createdAt.getTime() + DAY_MS),
        to: new Date(NOW.getTime() - 3 * DAY_MS),
      });
      const mediationStarted = faker.date.between({
        from: summonedAt,
        to: new Date(NOW.getTime() - 2 * DAY_MS),
      });
      updates.push({
        status: "summoned",
        publicNote: "Respondent was summoned before the Punong Barangay.",
        createdAt: summonedAt,
      });
      updates.push({
        status: "mediation",
        publicNote: "Mediation before the Punong Barangay.",
        createdAt: mediationStarted,
        hearingAt: mediationStarted,
      });

      let lastStepAt = mediationStarted;

      if (item.status === "certified") {
        // Mediation failed, so the Pangkat was constituted for conciliation,
        // which also failed — hence the certification for court filing.
        lastStepAt = faker.date.between({
          from: mediationStarted,
          to: new Date(NOW.getTime() - DAY_MS),
        });
        updates.push({
          status: "conciliation",
          publicNote: "Conciliation before the Pangkat ng Tagapagkasundo.",
          createdAt: lastStepAt,
        });
      }

      const resolvedAt = faker.date.between({ from: lastStepAt, to: NOW });
      const note = {
        settled: "The parties reached an amicable settlement.",
        certified: "No amicable settlement was reached; certified for court filing.",
        dismissed: "The complaint was dismissed for lack of merit.",
      }[item.status];
      updates.push({
        status: item.status,
        publicNote: note,
        createdAt: resolvedAt,
        internalNote: "Seed data entry.",
      });
      dueAt = null;
    } else {
      dueAt = new Date(createdAt.getTime() + deadlineDays.received * DAY_MS);
    }

    await prisma.complaint.create({
      data: {
        reference,

        // Complainant
        complainantName: faker.person.fullName(),
        complainantAge: faker.number.int({ min: 18, max: 80 }),
        complainantPurok: `Purok ${faker.number.int({ min: 1, max: 10 })}`,
        complainantContact: contact,
        contactNormalized: contact.replace(/\D/g, ""),
        complainantAddress: faker.location.streetAddress(true),

        // Respondent
        respondentName: faker.person.fullName(),
        respondentAddress: faker.helpers.maybe(() => faker.location.streetAddress(true), {
          probability: 0.8,
        }),
        relationship: faker.helpers.arrayElement([
          "Neighbor",
          "Relative",
          "Friend",
          "Acquaintance",
          "Stranger",
        ]),

        // Incident
        complaintType: faker.helpers.arrayElement(COMPLAINT_TYPES),
        incidentAt,
        incidentPlace: faker.location.city(),
        narrative: faker.lorem.paragraphs(2),

        status: item.status,
        dueAt,
        createdAt,
        consentAt: faker.date.between({ from: createdAt, to: new Date() }),
        viewedAt: openedAt,

        ...(panel.length > 0 && {
          pangkatMembers: panel,
          pangkatChairman: panel[0]!.fullName,
        }),


        evidence: { create: evidence },
        updates: { create: updates },
      },
    });
  }

  await prisma.referenceCounter.update({
    where: { year },
    data: { lastValue: sequence },
  });

  console.log(
    `✅ Seeded ${plan.length} complaints with evidence (mixed freshness/statuses).`,
  );

  // ---- Staff inbox: recent cases with a mix of read and unread alerts ----
  const staff = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (staff.length > 0) {
    const inboxCases = await prisma.complaint.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        reference: true,
        complainantName: true,
        respondentName: true,
        createdAt: true,
      },
    });

    const rows = inboxCases.flatMap((complaint) =>
      staff.map((member) => ({
        userId: member.id,
        type: "new_complaint",
        title: `New complaint ${complaint.reference}`,
        body: `${complaint.complainantName} filed a complaint just now.`,
        complaintId: complaint.id,
        reference: complaint.reference,
        dedupeKey: `seed:new_complaint:${complaint.id}:${member.id}`,
        readAt:
          faker.number.float({ min: 0, max: 1 }) < 0.45
            ? faker.date.between({ from: complaint.createdAt, to: new Date() })
            : null,
        createdAt: complaint.createdAt,
      })),
    );

    await prisma.notification.createMany({ data: rows, skipDuplicates: true });
    const readCount = rows.filter((row) => row.readAt !== null).length;
    console.log(`✅ Seeded ${rows.length} staff notifications (${readCount} already read).`);
  }

  // ---- One session per case that has reached a session stage ----
  const now = new Date();

  const recent = await prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });

  type SessionPlan = {
    offsetDays: number;
    kind: string;
    status: string;
    outcome?: string;
    attendance?: { complainant: string; respondent: string };
  };

  const sessionsFor: Partial<Record<string, SessionPlan[]>> = {
    mediation: [{ offsetDays: 3, kind: "mediation", status: "scheduled" }],
    conciliation: [
      { offsetDays: 4, kind: "conciliation", status: "scheduled" },
    ],
    settled: [
      {
        offsetDays: -5,
        kind: "mediation",
        status: "completed",
        outcome: "Parties reached an amicable settlement.",
        attendance: { complainant: "present", respondent: "present" },
      },
    ],
    certified: [
      {
        offsetDays: -14,
        kind: "mediation",
        status: "completed",
        outcome: "No settlement reached; the case was referred to the Pangkat.",
        attendance: { complainant: "present", respondent: "absent" },
      },
      {
        offsetDays: -12,
        kind: "conciliation",
        status: "completed",
        outcome: "No settlement; the case was certified for court filing.",
        attendance: { complainant: "present", respondent: "absent" },
      },
    ],
  };

  let hearingCount = 0;

  for (const complaint of recent) {
    for (const session of sessionsFor[complaint.status] ?? []) {
      const scheduledAt = new Date(now);
      scheduledAt.setDate(scheduledAt.getDate() + session.offsetDays);
      scheduledAt.setHours(9, 0, 0, 0);

      await prisma.hearing.create({
        data: {
          complaintId: complaint.id,
          scheduledAt,
          kind: session.kind,
          status: session.status,
          location: "Barangay Hall Session Room",
          outcome: session.outcome ?? null,
          complainantAttendance: session.attendance?.complainant ?? null,
          respondentAttendance: session.attendance?.respondent ?? null,
          attendanceRecordedAt: session.attendance ? scheduledAt : null,
        },
      });

      hearingCount++;
    }
  }

  console.log(`✅ Seeded ${hearingCount} hearings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
