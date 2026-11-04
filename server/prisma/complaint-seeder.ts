import "../src/utils/load-env.js";
import { prisma } from "../src/db";
import {
  formatReference,
  referencePeriod,
} from "../src/modules/complaint/complaint.helpers.js";
import { faker } from "@faker-js/faker";
import { makeEvidence } from "./fake-evidence.js";
import {
  BARANGAY_DEMO_OFFICIALS,
  DEMO_SECRETARY,
  LUPON_DEMO_MEMBERS,
} from "./demo-roster.js";

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
const ARBITRATION_DEADLINE_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

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

  // Demo cases are numbered per month from 0001, like live filings, so a
  // reseed leaves the counters just past the last reference it issued.
  const issuedByPeriod = new Map<string, number>();

  function seedReference(createdAt: Date): string {
    const period = referencePeriod(createdAt);
    const value = (issuedByPeriod.get(period) ?? 0) + 1;
    issuedByPeriod.set(period, value);

    return formatReference(period, value);
  }

  const settings = await prisma.barangaySettings.findUnique({
    where: { id: 1 },
    select: {
      deadlineReceived: true,
      deadlineSummoned: true,
      deadlineMediation: true,
      deadlineConciliation: true,
      deadlineArbitration: true,
    },
  });
  const deadlineDays = {
    received: settings?.deadlineReceived ?? RECEIVED_DEADLINE_DAYS,
    summoned: settings?.deadlineSummoned ?? SUMMONED_DEADLINE_DAYS,
    mediation: settings?.deadlineMediation ?? MEDIATION_DEADLINE_DAYS,
    conciliation:
      settings?.deadlineConciliation ?? CONCILIATION_DEADLINE_DAYS,
    arbitration:
      settings?.deadlineArbitration ?? ARBITRATION_DEADLINE_DAYS,
  };

  // ---- Lupon roster, kept across reseeds so staff edits survive ----
  const rosterSelect = { id: true, fullName: true } as const;
  const readRoster = () =>
    prisma.luponMember.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: rosterSelect,
    });
  let roster = await readRoster();

  if (roster.length < LUPON_DEMO_MEMBERS.length) {
    const listed = new Set(roster.map((member) => member.fullName));
    const missing = LUPON_DEMO_MEMBERS.filter(
      (member) => !listed.has(member.fullName),
    ).slice(0, LUPON_DEMO_MEMBERS.length - roster.length);
    if (missing.length > 0) {
      await prisma.luponMember.createMany({ data: missing });
      roster = await readRoster();
      console.log(`✅ Seeded ${roster.length} Lupon members.`);
    }
  }

  // ---- Published council roster, only while the site has none ----
  const publishedOfficials = await prisma.barangaySettings
    .findUnique({ where: { id: 1 }, select: { officials: true } })
    .then((row) => row?.officials ?? []);
  if (publishedOfficials.length === 0) {
    await prisma.barangaySettings.upsert({
      where: { id: 1 },
      update: { officials: BARANGAY_DEMO_OFFICIALS },
      create: {
        id: 1,
        officials: BARANGAY_DEMO_OFFICIALS,
        // RA 7160 §403: the same person signs as secretary of the lupon, so
        // the letterhead and the staff accounts name one secretary.
        secretaryName: DEMO_SECRETARY.fullName,
      },
    });
    console.log(`✅ Seeded ${BARANGAY_DEMO_OFFICIALS.length} barangay officials.`);
  }

  // One case per lifecycle stage so every screen (list, calendar, mediation,
  // reports) has something real to show.
  type SeedPlan = {
    status:
      | "received"
      | "summoned"
      | "mediation"
      | "conciliation"
      | "arbitration"
      | "settled"
      | "certified";
    ageDays: number; // how long ago the complaint was filed
  };

  const plan: SeedPlan[] = [
    { status: "received", ageDays: 0 },
    { status: "summoned", ageDays: 4 },
    { status: "mediation", ageDays: 12 },
    { status: "conciliation", ageDays: 22 },
    { status: "arbitration", ageDays: 26 },
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

    const reference = seedReference(createdAt);

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
      ["conciliation", "arbitration", "certified"].includes(item.status)
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
    } else if (item.status === "arbitration") {
      // Mediation failed, the Pangkat was constituted, and then the parties
      // agreed in writing to abide by an arbitration award (RA 7160 §413).
      const summonedAt = faker.date.between({
        from: new Date(createdAt.getTime() + DAY_MS),
        to: new Date(NOW.getTime() - 6 * DAY_MS),
      });
      const mediationStarted = faker.date.between({
        from: summonedAt,
        to: new Date(NOW.getTime() - 5 * DAY_MS),
      });
      const conciliationStarted = faker.date.between({
        from: mediationStarted,
        to: new Date(NOW.getTime() - 3 * DAY_MS),
      });
      const agreementAt = faker.date.between({
        from: conciliationStarted,
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
        hearingAt: conciliationStarted,
      });
      updates.push({
        status: "arbitration",
        publicNote:
          "The parties agreed in writing to abide by the arbitration award.",
        createdAt: agreementAt,
      });
      dueAt = new Date(
        agreementAt.getTime() + deadlineDays.arbitration * DAY_MS,
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

  for (const [period, lastValue] of issuedByPeriod) {
    await prisma.referenceCounter.upsert({
      where: { period },
      update: { lastValue },
      create: { period, lastValue },
    });
  }

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
    arbitration: [
      { offsetDays: 2, kind: "hearing", status: "scheduled" },
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
