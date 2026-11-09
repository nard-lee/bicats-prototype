import "../src/utils/load-env.js";
import { prisma } from "../src/db";
import type { Prisma } from "../src/generated/prisma/client.js";
import type { EligibilityAnswers } from "../src/modules/complaint/complaint.eligibility.js";
import {
  nextReference,
  normalizePhone,
  referencePeriod,
} from "../src/modules/complaint/complaint.helpers.js";
import { makeEvidence, removeEvidenceFiles } from "./fake-evidence.js";
import {
  BARANGAY_DEMO_OFFICIALS,
  LUPON_DEMO_MEMBERS,
} from "./demo-roster.js";

// One showcase case that walks the whole Katarungang Pambarangay process and
// ends certified for filing in court, so the printable case summary and the
// Certificate to File Action have a complete record to render: the eligibility
// screening, two service attempts, a first session the respondent missed,
// mediation before the Punong Barangay, conciliation before a constituted
// Pangkat, an arbitration agreement that falls through before any award, and
// the staff audit trail behind all of it.
//
// Re-runnable: it deletes the case it created last time (matched on the
// complainant's name) together with that case's notifications and audit rows,
// then inserts a fresh one dated relative to today.

const DEMO_COMPLAINANT = "Reynaldo A. Dela Cruz";
const DEMO_RESPONDENT = "Ernesto B. Villanueva";
const DAY_MS = 24 * 60 * 60 * 1000;

// Filed a month back: every step fits inside the statutory periods and the
// case still looks recent in the staff lists.
const CASE_AGE_DAYS = 30;

const PB_OFFICE = "Office of the Punong Barangay, Barangay Kabayanihan";
const SESSION_HALL = "Session Hall, Barangay Kabayanihan";

// The generated files are real PNGs and PDFs; only the names shown to staff
// are made to read like what a debt case would actually carry.
const DOCUMENT_NAMES = [
  "promissory-notes-signed.pdf",
  "delivery-receipts-and-statement.pdf",
  "written-demand-with-receipt.pdf",
];
const SCAN_NAMES = [
  "acknowledgment-page-scan.png",
  "text-messages-page-1.png",
  "signature-page-scan.png",
];

const longDate = (date: Date) =>
  date.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

async function main() {
  const now = new Date();
  const filedAt = new Date(now.getTime() - CASE_AGE_DAYS * DAY_MS);
  filedAt.setHours(0, 0, 0, 0);

  // n = days after filing, with the clock read from midnight so an office hour
  // stays the office hour it was written as. The case ends certified two days
  // before today.
  const at = (n: number, hour = 9, minute = 0) =>
    new Date(
      filedAt.getTime() + n * DAY_MS + hour * 60 * 60 * 1000 + minute * 60 * 1000,
    );

  const deliveryAt = at(-210, 10);
  const maturityAt = at(-45, 17);
  const demandAt = at(-20, 11);

  const contact = "0917 555 0143";

  // The screening is marked eligible the morning after filing, and no status
  // after intake is recorded before that moment: an unreviewed case cannot move
  // forward, so the timeline has to read as if the rule was followed.
  const eligibilityAt = at(1, 9, 15);
  const firstStatusChangeAt = at(1, 10, 0);
  if (firstStatusChangeAt <= eligibilityAt) {
    throw new Error("Case timeline would move a status before eligibility was marked.");
  }

  // ---- Actors: the people who did the work, taken from the seeded accounts ----
  type Actor = { id: number; fullName: string; role: string };
  const findActor = async (
    role: "admin" | "staff" | "secretary" | "lupon",
  ): Promise<Actor | null> => {
    const user = await prisma.user.findFirst({
      where: { role, isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, fullName: true, role: true },
    });
    return user ? { id: user.id, fullName: user.fullName, role: String(user.role) } : null;
  };

  const pb = await findActor("admin");
  if (!pb) {
    throw new Error(
      "No Punong Barangay account (role admin) found. Run pnpm run db:seed:users first.",
    );
  }
  const helper = (await findActor("staff")) ?? pb;

  // The Pangkat is three lupon members. Fixed names keep the printed record
  // stable between runs; the roster itself is whatever the office maintains,
  // except that a database with no roster at all gets the demo one so this case
  // has real names to sit on.
  const rosterSelect = { id: true, fullName: true } as const;
  const readRoster = () =>
    prisma.luponMember.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: rosterSelect,
    });
  let roster = await readRoster();

  if (roster.length < 3) {
    const listed = new Set(roster.map((member) => member.fullName));
    const missing = LUPON_DEMO_MEMBERS.filter((member) => !listed.has(member.fullName));
    if (missing.length > 0) await prisma.luponMember.createMany({ data: missing });
    roster = await readRoster();
    console.log(`✅ Seeded the lupon roster: ${roster.length} members.`);
  }
  if (roster.length < 3) {
    throw new Error(
      "The lupon roster has fewer than three members. Run pnpm run db:seed first.",
    );
  }

  // The published council roster goes out only while the site has none, so an
  // office that already named its officials is never overwritten.
  const publishedOfficials = await prisma.barangaySettings
    .findUnique({ where: { id: 1 }, select: { officials: true } })
    .then((row) => row?.officials ?? []);
  if (publishedOfficials.length === 0) {
    await prisma.barangaySettings.upsert({
      where: { id: 1 },
      update: { officials: BARANGAY_DEMO_OFFICIALS },
      create: { id: 1, officials: BARANGAY_DEMO_OFFICIALS },
    });
    console.log(`✅ Published ${BARANGAY_DEMO_OFFICIALS.length} barangay officials.`);
  }
  const wanted = ["Elena Bautista", "Nestor Aquino", "Rowena Villamor"];
  const picked = wanted
    .map((name) => roster.find((member) => member.fullName === name))
    .filter((member): member is { id: number; fullName: string } => Boolean(member));
  const panel = (picked.length === 3 ? picked : roster.slice(0, 3)).map((member, index) => ({
    id: member.id,
    fullName: member.fullName,
    isChairman: index === 0,
  }));

  const chairmanUser =
    (await prisma.user
      .findFirst({
        where: { fullName: panel[0]!.fullName, isActive: true },
        select: { id: true, fullName: true, role: true },
      })
      .then((user) => (user ? { id: user.id, fullName: user.fullName, role: String(user.role) } : null))) ??
    helper;

  const listing = panel
    .map((member) => (member.isChairman ? `${member.fullName} (chairman)` : member.fullName))
    .join(", ");

  // ---- Evidence files ----
  const files = await makeEvidence(3);
  let documentSlot = 0;
  let scanSlot = 0;
  const evidence = files.map((file) => {
    const isPdf = file.mimeType === "application/pdf";
    const names = isPdf ? DOCUMENT_NAMES : SCAN_NAMES;
    const slot = isPdf ? documentSlot++ : scanSlot++;
    const name =
      names[slot % names.length] ?? `evidence-${slot + 1}${isPdf ? ".pdf" : ".png"}`;
    return { ...file, originalName: name };
  });

  // ---- Clear the previous run ----
  const previous = await prisma.complaint.findMany({
    where: { complainantName: DEMO_COMPLAINANT, respondentName: DEMO_RESPONDENT },
    select: { id: true, hearings: { select: { id: true } } },
  });
  if (previous.length > 0) {
    const complaintIds = previous.map((row) => row.id);
    const hearingIds = previous.flatMap((row) => row.hearings.map((h) => h.id));
    // The evidence rows cascade with the complaint, so their files are read and
    // removed here instead of being left behind unreferenced.
    const orphanedFiles = await prisma.evidence
      .findMany({ where: { complaintId: { in: complaintIds } }, select: { storedName: true } })
      .then((rows) => rows.map((row) => row.storedName));
    await prisma.notification.deleteMany({ where: { complaintId: { in: complaintIds } } });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: "complaint", entityId: { in: complaintIds } },
          ...(hearingIds.length > 0
            ? [{ entityType: "hearing" as const, entityId: { in: hearingIds } }]
            : []),
        ],
      },
    });
    await prisma.complaint.deleteMany({ where: { id: { in: complaintIds } } });
    await removeEvidenceFiles(orphanedFiles);
  }

  const eligibilityAnswers: EligibilityAnswers = {
    respondentResidency: "same_barangay",
    adjoiningAgreement: null,
    againstGovernment: "no",
    seriousOffenseOrVawc: "no",
    propertyOutsideCity: "no",
    propertyAgreement: null,
  };

  type AuditRow = {
    when: Date;
    actor: Actor | null;
    action: string;
    entityType: string;
    entityId: number;
    summary: string;
    meta?: Prisma.InputJsonValue;
  };
  const auditRows: AuditRow[] = [];
  const record = (row: AuditRow) => auditRows.push(row);

  const reference = await prisma.$transaction(async (tx) => {
    const ref = await nextReference(tx, referencePeriod(filedAt));

    const complaint = await tx.complaint.create({
      data: {
        reference: ref,

        complainantName: DEMO_COMPLAINANT,
        complainantAge: 47,
        complainantPurok: "Purok 3",
        complainantContact: contact,
        contactNormalized: normalizePhone(contact),
        complainantEmail: "reynaldo.delacruz@example.com",
        complainantAddress: "Blk 7 Lot 12, Purok 3, Barangay Kabayanihan",
        complainantLang: "en",

        respondentName: DEMO_RESPONDENT,
        respondentAddress: "Blk 2 Lot 8, Purok 5, Barangay Kabayanihan",
        relationship: "Business acquaintance",

        complaintType: "type8",
        incidentAt: maturityAt,
        incidentPlace: "Purok 1, Barangay Kabayanihan",
        narrative:
          `On ${longDate(deliveryAt)} the complainant, who runs a construction supply business, delivered ` +
          `cement, hollow blocks and roofing materials worth Forty-Five Thousand Pesos (Php 45,000.00) to the ` +
          `respondent for the respondent's hardware store in Purok 1. The respondent took delivery in full and ` +
          `signed two promissory notes promising to pay the whole amount on or before ${longDate(maturityAt)}, ` +
          `without interest and without post-dated checks.\n\n` +
          `Nothing was paid when the notes fell due. The complainant served a written demand on ` +
          `${longDate(demandAt)} and repeated it twice in person and by text message. The respondent ` +
          `acknowledged the obligation every time and asked for more time, but no amount was turned over. The ` +
          `complainant asks the barangay to require the respondent to pay the unpaid balance of Php 45,000.00.`,

        status: "certified",
        // A closed case carries no pending deadline.
        dueAt: null,
        consentAt: at(0, 8, 30),
        viewedAt: at(0, 14, 5),

        eligibilityStatus: "eligible",
        eligibilityAnswers: eligibilityAnswers as Prisma.InputJsonValue,
        eligibilityNotes:
          "Both parties reside in Barangay Kabayanihan and the respondent has operated his store here for more than six months. Nothing in the complaint falls under the excluded cases.",
        eligibilityReviewedAt: eligibilityAt,

        pangkatMembers: panel as unknown as Prisma.InputJsonValue,
        pangkatChairman: panel[0]!.fullName,

        // The case reached arbitration out of a failed conciliation, so the
        // Pangkat ng Tagapagkasundo (§413(b)) heard it, not the Punong Barangay.
        arbitrationBy: "pangkat",
        arbitrationAgreementAt: at(24, 15, 10),

        createdAt: at(0, 8, 30),

        evidence: { create: evidence },
        updates: {
          create: [
            {
              status: "received",
              publicNote: "Complaint received and recorded.",
              createdAt: at(0, 8, 30),
            },
            {
              status: "summoned",
              publicNote: "Respondent was summoned before the Punong Barangay.",
              internalNote:
                "Summons prepared and turned over to the barangay tanod for service; posting copy ordered for the Purok 3 bulletin board.",
              createdById: pb.id,
              createdAt: firstStatusChangeAt,
            },
            {
              status: "mediation",
              publicNote: "Mediation before the Punong Barangay.",
              internalNote:
                "Respondent did not appear on the first summons. First default recorded; the session was reset and service ordered again.",
              hearingAt: at(9, 9, 0),
              createdById: pb.id,
              createdAt: at(9, 9, 25),
            },
            {
              status: "conciliation",
              publicNote: "Conciliation before the Pangkat ng Tagapagkasundo.",
              internalNote:
                "Mediation before the Punong Barangay failed, so the Pangkat ng Tagapagkasundo was constituted from the lupon roster.",
              hearingAt: at(20, 10, 0),
              createdById: pb.id,
              createdAt: at(16, 11, 30),
            },
            {
              status: "arbitration",
              publicNote:
                "The parties agreed in writing to abide by the arbitration award.",
              internalNote:
                "Signed arbitration agreement filed with the barangay secretary; award hearing set and notice posted.",
              hearingAt: at(27, 9, 30),
              createdById: chairmanUser.id,
              createdAt: at(24, 15, 10),
            },
            {
              status: "certified",
              publicNote:
                "No amicable settlement was reached; the case is certified for filing in court.",
              internalNote:
                "Complainant repudiated the arbitration agreement in writing before any award was rendered, so the arbitration hearing was cancelled and a certificate to file action was issued and recorded.",
              createdById: chairmanUser.id,
              createdAt: at(26, 15, 45),
            },
          ],
        },
      },
    });

    record({
      when: eligibilityAt,
      actor: pb,
      action: "complaint.eligibility.update",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: eligibility changed from "unreviewed" to "eligible"`,
      meta: {
        eligibilityStatus: "eligible",
        previousStatus: "unreviewed",
        previousComplaintStatus: "received",
        dismissed: false,
        hasNotes: true,
        hasReason: false,
      },
    });

    // ---- Proof of service: two attempts before the first session ----
    const firstAttempt = await tx.serviceRecord.create({
      data: {
        complaintId: complaint.id,
        servedAt: at(4, 16, 40),
        serverName: "Rodel Mendoza (Barangay Tanod)",
        result: "not_found",
        notes:
          "Respondent was away for work in Manila. No one at the residence would accept the summons; a notice was left with a neighbour.",
        createdById: helper.id,
        createdAt: at(4, 17, 10),
      },
    });
    record({
      when: at(4, 17, 10),
      actor: helper,
      action: "complaint.service.record",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: proof of service recorded (not_found) by Rodel Mendoza (Barangay Tanod)`,
      meta: {
        result: "not_found",
        serverName: "Rodel Mendoza (Barangay Tanod)",
        deadlineUpdated: false,
        dueAt: null,
        serviceRecordId: firstAttempt.id,
      },
    });

    const secondAttempt = await tx.serviceRecord.create({
      data: {
        complaintId: complaint.id,
        servedAt: at(6, 10, 5),
        serverName: "Rodel Mendoza (Barangay Tanod)",
        result: "received",
        notes: "Summons personally received by the respondent at his residence in Purok 5.",
        createdById: helper.id,
        createdAt: at(6, 10, 30),
      },
    });
    record({
      when: at(6, 10, 30),
      actor: helper,
      action: "complaint.service.record",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: proof of service recorded (received) by Rodel Mendoza (Barangay Tanod)`,
      meta: {
        result: "received",
        serverName: "Rodel Mendoza (Barangay Tanod)",
        deadlineUpdated: true,
        dueAt: at(9, 9, 0).toISOString(),
        serviceRecordId: secondAttempt.id,
      },
    });

    // ---- Sessions ----
    const sessions = [
      {
        scheduledAt: at(9, 9, 0),
        kind: "mediation",
        status: "no_show",
        location: PB_OFFICE,
        notes: "First mediation session before the Punong Barangay.",
        outcome:
          "Respondent did not appear. The Punong Barangay warned that two defaults in a row end the proceedings, and reset the session.",
        complainantAttendance: "present",
        respondentAttendance: "absent",
        attendanceNotes: "Complainant appeared with two witnesses from his store.",
        createdBy: pb,
        createdAt: at(7, 14, 0),
        attendanceRecordedAt: at(9, 9, 20),
      },
      {
        scheduledAt: at(14, 9, 0),
        kind: "mediation",
        status: "completed",
        location: PB_OFFICE,
        notes: "Second mediation session before the Punong Barangay.",
        outcome:
          "No settlement. The respondent admitted the debt but offered Php 5,000.00 a month with no schedule; the complainant refused and both asked that the case go to the Pangkat.",
        complainantAttendance: "present",
        respondentAttendance: "present",
        attendanceNotes: "Both parties appeared in person.",
        createdBy: pb,
        createdAt: at(10, 9, 30),
        attendanceRecordedAt: at(14, 9, 15),
      },
      {
        scheduledAt: at(20, 10, 0),
        kind: "conciliation",
        status: "completed",
        location: SESSION_HALL,
        notes: "Conciliation before the Pangkat ng Tagapagkasundo.",
        outcome:
          "No settlement. The Pangkat proposed eighteen monthly installments with the store inventory as security; the complainant would accept twelve months and the respondent could not. Conciliation declared failed.",
        complainantAttendance: "present",
        respondentAttendance: "present",
        attendanceNotes: "Pangkat chairman presided; barangay secretary took the minutes.",
        createdBy: chairmanUser,
        createdAt: at(16, 11, 45),
        attendanceRecordedAt: at(20, 10, 20),
      },
      {
        scheduledAt: at(27, 9, 30),
        kind: "hearing",
        status: "cancelled",
        location: SESSION_HALL,
        notes: "Arbitration hearing before the Pangkat ng Tagapagkasundo.",
        outcome:
          "Cancelled. The complainant repudiated the arbitration agreement in writing two days before the hearing and asked for a certificate to file action.",
        complainantAttendance: null,
        respondentAttendance: null,
        attendanceNotes: null,
        createdBy: chairmanUser,
        createdAt: at(24, 15, 25),
        attendanceRecordedAt: null,
      },
    ];

    const hearingIds: number[] = [];
    for (const session of sessions) {
      const hearing = await tx.hearing.create({
        data: {
          complaintId: complaint.id,
          scheduledAt: session.scheduledAt,
          kind: session.kind,
          status: session.status,
          location: session.location,
          notes: session.notes,
          outcome: session.outcome,
          complainantAttendance: session.complainantAttendance,
          respondentAttendance: session.respondentAttendance,
          attendanceNotes: session.attendanceNotes,
          attendanceRecordedAt: session.attendanceRecordedAt,
          createdById: session.createdBy.id,
          createdAt: session.createdAt,
        },
      });
      hearingIds.push(hearing.id);

      record({
        when: session.createdAt,
        actor: session.createdBy,
        action: "hearing.create",
        entityType: "hearing",
        entityId: hearing.id,
        summary: `Scheduled ${session.kind === "hearing" ? "arbitration" : session.kind} session for ${ref}`,
        meta: {
          complaintId: complaint.id,
          reference: ref,
          kind: session.kind,
          status: "scheduled",
          scheduledAt: session.scheduledAt.toISOString(),
        },
      });

      if (session.attendanceRecordedAt) {
        record({
          when: session.attendanceRecordedAt,
          actor: session.createdBy,
          action: "hearing.attendance",
          entityType: "hearing",
          entityId: hearing.id,
          summary: `Recorded attendance for ${session.kind === "hearing" ? "arbitration" : session.kind} on ${ref}: complainant ${session.complainantAttendance}, respondent ${session.respondentAttendance}`,
          meta: {
            reference: ref,
            complainant: session.complainantAttendance,
            respondent: session.respondentAttendance,
          },
        });
      }
    }

    record({
      when: at(26, 15, 30),
      actor: chairmanUser,
      action: "hearing.update",
      entityType: "hearing",
      entityId: hearingIds[3]!,
      summary: `Cancelled arbitration for ${ref}`,
      meta: { reference: ref, cancelled: true, reason: "arbitration agreement repudiated" },
    });

    record({
      when: firstStatusChangeAt,
      actor: pb,
      action: "complaint.status.update",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: status changed from "received" to "summoned"`,
      meta: { status: "summoned", previousStatus: "received", hasPublicNote: true, hasInternalNote: true },
    });
    record({
      when: at(9, 9, 25),
      actor: pb,
      action: "complaint.status.update",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: status changed from "summoned" to "mediation"`,
      meta: { status: "mediation", previousStatus: "summoned", hasPublicNote: true, hasInternalNote: true },
    });
    record({
      when: at(16, 11, 30),
      actor: pb,
      action: "complaint.pangkat.update",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: Pangkat recorded as "${listing}"`,
      meta: {
        memberIds: panel.map((member) => member.id),
        chairmanId: panel[0]!.id,
        previous: null,
      },
    });
    record({
      when: at(16, 11, 35),
      actor: pb,
      action: "complaint.status.update",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: status changed from "mediation" to "conciliation"`,
      meta: { status: "conciliation", previousStatus: "mediation", hasPublicNote: true, hasInternalNote: true },
    });
    record({
      when: at(24, 15, 10),
      actor: chairmanUser,
      action: "complaint.status.update",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: status changed from "conciliation" to "arbitration"`,
      meta: { status: "arbitration", previousStatus: "conciliation", arbitrationBy: "pangkat", hasPublicNote: true, hasInternalNote: true },
    });
    record({
      when: at(26, 15, 45),
      actor: chairmanUser,
      action: "complaint.status.update",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `${ref}: status changed from "arbitration" to "certified"`,
      meta: { status: "certified", previousStatus: "arbitration", hasPublicNote: true, hasInternalNote: true },
    });

    return ref;
  });

  auditRows.sort((a, b) => a.when.getTime() - b.when.getTime());
  await prisma.auditLog.createMany({
    data: auditRows.map((row) => ({
      actorId: row.actor?.id ?? null,
      actorName: row.actor?.fullName ?? null,
      actorRole: row.actor?.role ?? null,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.summary,
      ...(row.meta === undefined ? {} : { meta: row.meta }),
      createdAt: row.when,
    })),
  });

  console.log(
    `✅ Seeded showcase case ${reference}: ${DEMO_COMPLAINANT} vs ${DEMO_RESPONDENT}, certified for filing.`,
  );
  console.log("   Screening eligible, 2 service attempts, 4 sessions, 3 evidence files, 15 audit rows.");
}

main()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
