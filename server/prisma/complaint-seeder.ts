import "../src/utils/load-env.js";
import { prisma } from "../src/db";
import {
  formatReference,
  referencePeriod,
} from "../src/modules/complaint/complaint.helpers.js";
import { faker } from "@faker-js/faker";
import {
  evaluateEligibility,
  type EligibilityAnswers,
} from "../src/modules/complaint/complaint.eligibility.js";
import { makeEvidence, removeEvidenceFiles } from "./fake-evidence.js";
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
  const replacedEvidence = await prisma.evidence.findMany({
    select: { storedName: true },
  });

  await prisma.notification.deleteMany();
  await prisma.hearing.deleteMany();
  await prisma.statusUpdate.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.auditLog.deleteMany();

  // The rows cascaded away with the complaints, so their files have to be
  // removed here or every reseed leaks the uploads it replaced.
  await removeEvidenceFiles(replacedEvidence.map((file) => file.storedName));

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

  // A handful of cases per lifecycle stage so every screen (list, calendar,
  // mediation, reports) has something real to show.
  type SeedStatus =
    | "received"
    | "summoned"
    | "mediation"
    | "conciliation"
    | "arbitration"
    | "settled"
    | "certified"
    | "dismissed";

  // The KP screening each case got at intake, and what the staff did next.
  type ScreenKind = "clean" | "uncertain" | "legacy" | "outside";

  type SeedPlan = {
    // Where the case would stand once the screening clears it. Only "clean"
    // cases actually get the stage; see the screen gate below.
    status: SeedStatus;
    ageDays: number; // how long ago the complaint was filed
    screen: ScreenKind;
    // For an arbitration: who the parties gave the case to (§413). The
    // Punong Barangay alone is the route taken during mediation, so that case
    // never has a Pangkat; the panel route follows a failed conciliation.
    arbitrationBy?: "punong_barangay" | "pangkat";
  };

  const SAME_CITY: EligibilityAnswers = {
    respondentResidency: "same_barangay",
    adjoiningAgreement: null,
    againstGovernment: "no",
    seriousOffenseOrVawc: "no",
    propertyOutsideCity: "not_applicable",
    propertyAgreement: null,
  };

  const SCREENS: Record<
    ScreenKind,
    { answers: EligibilityAnswers | null; notes: string | null }
  > = {
    clean: { answers: SAME_CITY, notes: null },
    uncertain: {
      answers: { ...SAME_CITY, seriousOffenseOrVawc: "unsure" },
      notes: null,
    },
    // Filed before the intake questionnaire existed: nothing to screen against.
    legacy: { answers: null, notes: null },
    outside: {
      answers: {
        ...SAME_CITY,
        propertyOutsideCity: "yes",
        propertyAgreement: "no",
      },
      notes:
        "The property in dispute is outside the city and the parties' barangays do not adjoin. Referred to the proper court.",
    },
  };

  const plan: SeedPlan[] = [
    // Cleared for KP and waiting to be opened.
    { status: "received", ageDays: 0, screen: "clean" },
    { status: "received", ageDays: 1, screen: "clean" },
    // Planned past intake, but the screen holds them there: a case with an
    // uncertain answer, or no screening answers at all, cannot be advanced.
    { status: "mediation", ageDays: 2, screen: "uncertain" },
    { status: "conciliation", ageDays: 3, screen: "uncertain" },
    { status: "arbitration", ageDays: 3, screen: "legacy" },
    { status: "settled", ageDays: 4, screen: "legacy" },
    // Screened outside the lupon's authority, so it closed at intake.
    { status: "received", ageDays: 5, screen: "outside" },
    { status: "received", ageDays: 9, screen: "outside" },

    { status: "summoned", ageDays: 4, screen: "clean" },
    { status: "summoned", ageDays: 8, screen: "clean" },
    { status: "summoned", ageDays: 11, screen: "clean" },

    { status: "mediation", ageDays: 12, screen: "clean" },
    { status: "mediation", ageDays: 16, screen: "clean" },
    { status: "mediation", ageDays: 20, screen: "clean" },

    { status: "conciliation", ageDays: 22, screen: "clean" },
    { status: "conciliation", ageDays: 27, screen: "clean" },

    // Both §413 routes: the Punong Barangay alone, and the Pangkat.
    {
      status: "arbitration",
      ageDays: 29,
      screen: "clean",
      arbitrationBy: "punong_barangay",
    },
    { status: "arbitration", ageDays: 33, screen: "clean", arbitrationBy: "pangkat" },

    { status: "settled", ageDays: 30, screen: "clean" },
    { status: "settled", ageDays: 38, screen: "clean" },

    { status: "certified", ageDays: 45, screen: "clean" },
    { status: "certified", ageDays: 52, screen: "clean" },
  ];

  const TERMINAL: SeedStatus[] = ["settled", "certified", "dismissed"];
  const NOW = new Date();

  // Panels are stored chairman-first, the way the server freezes a snapshot,
  // and rotate through the roster so cases do not all show the same three
  // members with the same chair.
  function panelFor(index: number, status: SeedStatus) {
    if (
      roster.length < 3 ||
      !["conciliation", "arbitration", "certified"].includes(status)
    ) {
      return [];
    }

    const seats = [0, 1, 2].map(
      (offset) => roster[(index + offset) % roster.length]!,
    );
    const chair = index % 3;

    return [...seats.slice(chair), ...seats.slice(0, chair)].map(
      (member, seat) => ({
        id: member.id,
        fullName: member.fullName,
        isChairman: seat === 0,
      }),
    );
  }

  for (const [caseIndex, item] of plan.entries()) {
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

    // The screening decides how far a case may have got. Nothing is worked on
    // before it is cleared for KP: a pending or unscreened case waits at
    // intake, and a case screened outside the lupon's authority closes there.
    const screen = SCREENS[item.screen];
    const evaluation = screen.answers
      ? evaluateEligibility(screen.answers)
      : null;
    const eligibilityStatus = evaluation?.status ?? "unreviewed";
    const status: SeedStatus =
      eligibilityStatus === "eligible"
        ? item.status
        : eligibilityStatus === "outside_kp"
          ? "dismissed"
          : "received";

    // Only a staff decision leaves a review stamp; intake screens itself.
    const reviewedAt =
      eligibilityStatus === "outside_kp"
        ? faker.date.between({ from: createdAt, to: NOW })
        : null;

    const isTerminal = TERMINAL.includes(status);
    // §413: which arbiter an arbitration case is given to. Defaults to the
    // panel, the route a case takes after its conciliation fails.
    const arbitrationBy =
      status === "arbitration" ? (item.arbitrationBy ?? "pangkat") : null;
    // Mediation is the Punong Barangay alone, and so is a §413(a) arbitration:
    // only cases that reached a Pangkat carry a panel.
    const panel =
      arbitrationBy === "punong_barangay" ? [] : panelFor(caseIndex, status);

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
    // Set on the walk into arbitration; nothing else carries an agreement.
    let arbitrationAgreementAt: Date | null = null;

    if (status === "dismissed") {
      // Closed on the screening, before any summons was issued.
      updates.push({
        status: "dismissed",
        publicNote:
          "Case dismissed: the complaint falls outside the authority of the Katarungang Pambarangay.",
        internalNote: screen.notes,
        createdAt: reviewedAt!,
      });
      dueAt = null;
    } else if (status === "mediation") {
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
    } else if (status === "conciliation") {
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
    } else if (status === "arbitration") {
      // RA 7160 §413: the parties agreed in writing to abide by an arbitration
      // award. Either the Pangkat takes it after a failed conciliation, §413(b),
      // or the Punong Barangay hears it alone straight out of mediation, §413(a).
      const summonedAt = faker.date.between({
        from: new Date(createdAt.getTime() + DAY_MS),
        to: new Date(NOW.getTime() - 6 * DAY_MS),
      });
      const mediationStarted = faker.date.between({
        from: summonedAt,
        to: new Date(NOW.getTime() - 5 * DAY_MS),
      });
      const byPangkat = arbitrationBy === "pangkat";
      const conciliationStarted = byPangkat
        ? faker.date.between({
            from: mediationStarted,
            to: new Date(NOW.getTime() - 3 * DAY_MS),
          })
        : mediationStarted;
      const agreementAt = faker.date.between({
        from: conciliationStarted,
        to: new Date(NOW.getTime() - DAY_MS),
      });
      arbitrationAgreementAt = agreementAt;

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
      if (byPangkat) {
        updates.push({
          status: "conciliation",
          publicNote: "Conciliation before the Pangkat ng Tagapagkasundo.",
          createdAt: conciliationStarted,
          hearingAt: conciliationStarted,
        });
      }
      updates.push({
        status: "arbitration",
        publicNote: byPangkat
          ? "The parties agreed in writing to have the Pangkat arbitrate the case."
          : "The parties agreed in writing to have the Punong Barangay alone arbitrate the case.",
        createdAt: agreementAt,
      });
      dueAt = new Date(
        agreementAt.getTime() + deadlineDays.arbitration * DAY_MS,
      );
    } else if (status === "summoned") {
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

      if (status === "certified") {
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
      }[status];
      updates.push({
        status,
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

        status,
        dueAt,
        createdAt,
        consentAt: faker.date.between({ from: createdAt, to: new Date() }),
        viewedAt: openedAt,

        eligibilityStatus,
        eligibilityAnswers: screen.answers ?? undefined,
        eligibilityReason: evaluation?.reason ?? null,
        eligibilityNotes: screen.notes,
        eligibilityReviewedAt: reviewedAt,

        ...(panel.length > 0 && {
          pangkatMembers: panel,
          pangkatChairman: panel[0]!.fullName,
        }),

        ...(arbitrationBy && {
          arbitrationBy,
          arbitrationAgreementAt,
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

  const heldForScreen = plan.filter(
    (item) => item.screen === "uncertain" || item.screen === "legacy",
  ).length;

  console.log(
    `✅ Seeded ${plan.length} complaints with evidence (mixed freshness/statuses), ${heldForScreen} of them waiting on the eligibility screen.`,
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
