import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/db";

// Resets the demo complaint data to four cases that exercise every
// eligibility state (eligible, needs review, outside KP, legacy), five fresh
// open cases so the work queue has a realistic backlog, one summoned case
// with proof of service, and one case with a completed session and recorded
// attendance. Users, settings, and audit history are left alone.

const UPLOAD_DIR = path.resolve("uploads");
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR = new Date().getFullYear();
const SUFFIXES = ["Q4", "J9", "M7", "T3", "R2", "D6", "K8", "P5", "W6", "H4", "S9"];

const eligibleAnswers = {
  respondentResidency: "same_barangay",
  adjoiningAgreement: null,
  againstGovernment: "no",
  seriousOffenseOrVawc: "no",
  propertyOutsideCity: "not_applicable",
  propertyAgreement: null,
};

type SeedSample = {
  complainantName: string;
  complainantAge: number;
  complainantPurok: string;
  complainantContact: string;
  complainantAddress: string;
  respondentName: string;
  respondentAddress: string;
  relationship: string;
  complaintType: string;
  ageDays: number;
  narrative: string;
  status: string;
  eligibilityStatus: string;
  eligibilityAnswers: typeof eligibleAnswers | null;
  eligibilityNotes: string | null;
  reviewed: boolean;
  service?: {
    result: string;
    serverName: string;
    notes: string;
    delayDays: number;
  };
  hearing?: {
    kind: string;
    atDaysAgo: number;
    status: string;
    location: string;
    outcome: string;
    attendance: {
      complainant: string;
      respondent: string;
      notes: string;
    };
  };
};

const SAMPLES: SeedSample[] = [
  {
    complainantName: "Marisol Aquino",
    complainantAge: 41,
    complainantPurok: "Mabini Street",
    complainantContact: "09171230001",
    complainantAddress: "24 Mabini Street",
    respondentName: "Ramon Bautista",
    respondentAddress: "Purok 3, Barangay Kabayanihan",
    relationship: "Neighbor",
    complaintType: "type1",
    ageDays: 0.25,
    narrative:
      "The respondent's videoke runs past midnight on weekdays, and repeated requests to lower the volume have been ignored.",
    status: "received",
    eligibilityStatus: "eligible",
    eligibilityAnswers: eligibleAnswers,
    eligibilityNotes: null,
    reviewed: false,
  },
  {
    complainantName: "Teresa Ocampo",
    complainantAge: 36,
    complainantPurok: "General Luna Road",
    complainantContact: "09171230002",
    complainantAddress: "88 General Luna Road",
    respondentName: "Victor Salazar",
    respondentAddress: "Purok 5, Barangay Kabayanihan",
    relationship: "Acquaintance",
    complaintType: "type5",
    ageDays: 0.5,
    narrative:
      "The respondent shoved me during an argument outside the sari-sari store. I am not sure whether my injuries are serious enough to need the police or the barangay.",
    status: "received",
    eligibilityStatus: "needs_review",
    eligibilityAnswers: {
      ...eligibleAnswers,
      seriousOffenseOrVawc: "unsure",
    },
    eligibilityNotes: null,
    reviewed: false,
  },
  {
    complainantName: "Lorna Villanueva",
    complainantAge: 52,
    complainantPurok: "Assumption Road",
    complainantContact: "09171230003",
    complainantAddress: "7 Assumption Road",
    respondentName: "Ernesto Padilla",
    respondentAddress: "Tuba, Benguet",
    relationship: "Relative",
    complaintType: "type4",
    ageDays: 4,
    narrative:
      "We dispute the boundary of a lot in Tuba, Benguet. No amicable settlement has been reached between our families.",
    status: "dismissed",
    eligibilityStatus: "outside_kp",
    eligibilityAnswers: {
      ...eligibleAnswers,
      propertyOutsideCity: "yes",
      propertyAgreement: "no",
    },
    eligibilityNotes:
      "The disputed lot is in Tuba, Benguet and the barangays do not adjoin. Referred to the proper court.",
    reviewed: true,
  },
  {
    complainantName: "Josefa Ramos",
    complainantAge: 47,
    complainantPurok: "Session Road",
    complainantContact: "09171230004",
    complainantAddress: "31 Session Road",
    respondentName: "Miguel Torres",
    respondentAddress: "Purok 2, Barangay Kabayanihan",
    relationship: "Friend",
    complaintType: "type8",
    ageDays: 0.125,
    narrative:
      "The respondent borrowed money last year and has not paid despite several promises. I have kept the written agreement.",
    status: "received",
    eligibilityStatus: "unreviewed",
    eligibilityAnswers: null,
    eligibilityNotes: null,
    reviewed: false,
  },

  // Fresh open cases for the regular work queue.
  {
    complainantName: "Rowena Dela Peña",
    complainantAge: 33,
    complainantPurok: "Purok 4",
    complainantContact: "09171230005",
    complainantAddress: "12 Purok 4",
    respondentName: "Alfredo Silva",
    respondentAddress: "Purok 7, Barangay Kabayanihan",
    relationship: "Neighbor",
    complaintType: "type2",
    ageDays: 0.9,
    narrative:
      "The respondent keeps dumping household garbage along the creek behind our houses, and the smell has become unbearable.",
    status: "received",
    eligibilityStatus: "eligible",
    eligibilityAnswers: eligibleAnswers,
    eligibilityNotes: null,
    reviewed: false,
  },
  {
    complainantName: "Benjamin Yabut",
    complainantAge: 58,
    complainantPurok: "Purok 1",
    complainantContact: "09171230006",
    complainantAddress: "5 Purok 1",
    respondentName: "Leonora Cruz",
    respondentAddress: "Purok 1, Barangay Kabayanihan",
    relationship: "Neighbor",
    complaintType: "type3",
    ageDays: 0.75,
    narrative:
      "The respondent's dogs roam the street unleashed and chased my grandchildren on their way home from school.",
    status: "received",
    eligibilityStatus: "eligible",
    eligibilityAnswers: eligibleAnswers,
    eligibilityNotes: null,
    reviewed: false,
  },
  {
    complainantName: "Cristina Dizon",
    complainantAge: 27,
    complainantPurok: "Camp 7 Road",
    complainantContact: "09171230007",
    complainantAddress: "40 Camp 7 Road",
    respondentName: "Joel Manalo",
    respondentAddress: "Purok 6, Barangay Kabayanihan",
    relationship: "Acquaintance",
    complaintType: "type6",
    ageDays: 0.6,
    narrative:
      "The respondent shouted insults and threatened me in front of customers at my store after I asked him to settle his balance.",
    status: "received",
    eligibilityStatus: "eligible",
    eligibilityAnswers: eligibleAnswers,
    eligibilityNotes: null,
    reviewed: false,
  },
  {
    complainantName: "Rogelio Sison",
    complainantAge: 64,
    complainantPurok: "Purok 9",
    complainantContact: "09171230008",
    complainantAddress: "8 Purok 9",
    respondentName: "Marilou Ferrer",
    respondentAddress: "Purok 9, Barangay Kabayanihan",
    relationship: "Neighbor",
    complaintType: "type10",
    ageDays: 0.4,
    narrative:
      "The respondent extended their fence into the alley without a permit, blocking the path used by the whole block.",
    status: "received",
    eligibilityStatus: "eligible",
    eligibilityAnswers: eligibleAnswers,
    eligibilityNotes: null,
    reviewed: false,
  },
  {
    complainantName: "Divina Ledesma",
    complainantAge: 22,
    complainantPurok: "Purok 2",
    complainantContact: "09171230009",
    complainantAddress: "19 Purok 2",
    respondentName: "Kevin Rosales",
    respondentAddress: "Purok 2, Barangay Kabayanihan",
    relationship: "Friend",
    complaintType: "type11",
    ageDays: 0.2,
    narrative:
      "The respondent and his friends keep drinking in the street past the barangay curfew and make noise near our gate.",
    status: "received",
    eligibilityStatus: "eligible",
    eligibilityAnswers: eligibleAnswers,
    eligibilityNotes: null,
    reviewed: false,
  },

  // Summoned case with a recorded proof of service.
  {
    complainantName: "Anita Mercado",
    complainantAge: 39,
    complainantPurok: "Purok 6",
    complainantContact: "09171230010",
    complainantAddress: "22 Purok 6",
    respondentName: "Danilo Perez",
    respondentAddress: "Purok 8, Barangay Kabayanihan",
    relationship: "Neighbor",
    complaintType: "type7",
    ageDays: 0.8,
    narrative:
      "The respondent's construction materials spill into the shared alley and block access to our homes.",
    status: "summoned",
    eligibilityStatus: "eligible",
    eligibilityAnswers: eligibleAnswers,
    eligibilityNotes: null,
    reviewed: true,
    service: {
      result: "received",
      serverName: "Bgy. Tanod Cruz",
      notes: "Received by the respondent personally.",
      delayDays: 0.15,
    },
  },

  // Mediation case with a completed session and recorded attendance.
  {
    complainantName: "Leticia Moran",
    complainantAge: 45,
    complainantPurok: "Purok 5",
    complainantContact: "09171230011",
    complainantAddress: "31 Purok 5",
    respondentName: "Paolo Guerra",
    respondentAddress: "Purok 5, Barangay Kabayanihan",
    relationship: "Neighbor",
    complaintType: "type12",
    ageDays: 6,
    narrative:
      "The respondent's chickens keep wandering into my vegetable garden despite repeated requests to keep them penned.",
    status: "mediation",
    eligibilityStatus: "eligible",
    eligibilityAnswers: eligibleAnswers,
    eligibilityNotes: null,
    reviewed: true,
    hearing: {
      kind: "mediation",
      atDaysAgo: 2,
      status: "completed",
      location: "Barangay Hall Session Room",
      outcome: "Complainant attended; respondent did not appear.",
      attendance: {
        complainant: "present",
        respondent: "absent",
        notes: "Respondent did not appear. Mediation reset for the next session.",
      },
    },
  },
];

async function main() {
  console.log("🧹 Clearing complaints and their evidence files...");

  const evidence = await prisma.evidence.findMany({
    select: { storedName: true },
  });

  await prisma.notification.deleteMany();
  await prisma.hearing.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.statusUpdate.deleteMany();
  await prisma.complaint.deleteMany();

  await Promise.all(
    evidence.map((file) =>
      fs.rm(path.join(UPLOAD_DIR, file.storedName), { force: true }),
    ),
  );

  const counter = await prisma.referenceCounter.upsert({
    where: { year: YEAR },
    update: {},
    create: { year: YEAR, lastValue: 0 },
  });
  let sequence = counter.lastValue;

  const settings = await prisma.barangaySettings.findUnique({
    where: { id: 1 },
    select: {
      deadlineReceived: true,
      deadlineSummoned: true,
      deadlineMediation: true,
    },
  });
  const receivedDeadlineDays = settings?.deadlineReceived ?? 1;
  const summonedDeadlineDays = settings?.deadlineSummoned ?? 15;
  const mediationDeadlineDays = settings?.deadlineMediation ?? 15;

  const now = new Date();

  for (const [index, sample] of SAMPLES.entries()) {
    sequence += 1;
    const reference = `BK-${YEAR}-${String(sequence).padStart(6, "0")}-${SUFFIXES[index]}`;
    const createdAt = new Date(now.getTime() - sample.ageDays * DAY_MS);
    const isDismissed = sample.status === "dismissed";
    const servedAt = sample.service
      ? new Date(createdAt.getTime() + sample.service.delayDays * DAY_MS)
      : null;
    const hearingAt = sample.hearing
      ? new Date(now.getTime() - sample.hearing.atDaysAgo * DAY_MS)
      : null;

    const updates = [
      {
        status: "received",
        publicNote: "Complaint received and recorded.",
        createdAt,
      },
    ];

    if (isDismissed) {
      updates.push({
        status: "dismissed",
        publicNote:
          "Referred to the proper court — outside the barangay's authority.",
        createdAt: new Date(createdAt.getTime() + DAY_MS),
      });
    }

    if (["summoned", "mediation", "conciliation"].includes(sample.status)) {
      updates.push({
        status: "summoned",
        publicNote: "Summons issued to the respondent.",
        createdAt: new Date(createdAt.getTime() + 0.1 * DAY_MS),
      });
    }

    if (
      (sample.status === "mediation" || sample.status === "conciliation") &&
      hearingAt
    ) {
      updates.push({
        status: sample.status,
        publicNote:
          sample.status === "conciliation"
            ? "Conciliation session held."
            : "Mediation session held.",
        createdAt: hearingAt,
      });
    }

    const dueAt = isDismissed
      ? null
      : servedAt
        ? new Date(servedAt.getTime() + summonedDeadlineDays * DAY_MS)
        : new Date(
            (hearingAt ?? createdAt).getTime() +
              (sample.status === "summoned"
                ? summonedDeadlineDays
                : sample.status === "mediation" ||
                    sample.status === "conciliation"
                  ? mediationDeadlineDays
                  : receivedDeadlineDays) *
                DAY_MS,
          );

    await prisma.complaint.create({
      data: {
        reference,

        complainantName: sample.complainantName,
        complainantAge: sample.complainantAge,
        complainantPurok: sample.complainantPurok,
        complainantContact: sample.complainantContact,
        contactNormalized: sample.complainantContact.replace(/\D/g, ""),
        complainantAddress: sample.complainantAddress,

        respondentName: sample.respondentName,
        respondentAddress: sample.respondentAddress,
        relationship: sample.relationship,

        complaintType: sample.complaintType,
        incidentAt: new Date(createdAt.getTime() - 2 * DAY_MS),
        incidentPlace: "Barangay Kabayanihan",
        narrative: sample.narrative,

        status: sample.status,
        dueAt,
        createdAt,
        consentAt: createdAt,

        eligibilityStatus: sample.eligibilityStatus,
        eligibilityAnswers: sample.eligibilityAnswers ?? undefined,
        eligibilityNotes: sample.eligibilityNotes,
        eligibilityReviewedAt: sample.reviewed ? now : null,

        updates: { create: updates },

        ...(sample.service && servedAt
          ? {
              serviceRecords: {
                create: {
                  servedAt,
                  serverName: sample.service.serverName,
                  result: sample.service.result,
                  notes: sample.service.notes,
                },
              },
            }
          : {}),

        ...(sample.hearing && hearingAt
          ? {
              hearings: {
                create: {
                  scheduledAt: hearingAt,
                  kind: sample.hearing.kind,
                  status: sample.hearing.status,
                  location: sample.hearing.location,
                  outcome: sample.hearing.outcome,
                  complainantAttendance:
                    sample.hearing.attendance.complainant,
                  respondentAttendance: sample.hearing.attendance.respondent,
                  attendanceNotes: sample.hearing.attendance.notes,
                  attendanceRecordedAt: new Date(
                    hearingAt.getTime() + 0.05 * DAY_MS,
                  ),
                },
              },
            }
          : {}),
      },
    });

    console.log(`   ↳ ${sample.eligibilityStatus.padEnd(13)} ${reference}`);
  }

  await prisma.referenceCounter.update({
    where: { year: YEAR },
    data: { lastValue: sequence },
  });

  console.log(
    `✅ Seeded ${SAMPLES.length} demo complaints (4 eligibility samples + 5 open received + 1 summoned with proof of service + 1 mediation with attendance).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
