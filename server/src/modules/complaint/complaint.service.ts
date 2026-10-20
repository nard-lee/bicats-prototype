
import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";

import { COMPLAINT_STATUSES, COMPLAINT_PRIORITIES, computeNextDueAt, deadlineDaysFrom } from "./complaint.schema.js";
import type {
    ComplaintDetail,
    ComplaintListFilters,
    ComplaintListRow,
    ComplaintTrackResult,
    CreateComplaintInput,
    Paginated,
} from "./complaint.schema.js";
import settingService from "../setting/setting.service.js";

// Atomically reserves the next number for the year and formats it as
// BK-<year>-000001. The upsert runs inside the complaint transaction so two
// concurrent filings can never share a sequence number.
async function nextReference(tx: Prisma.TransactionClient, year: number): Promise<string> {
    const rows = await tx.$queryRaw<{ lastValue: number }[]>`
        INSERT INTO "ReferenceCounter" ("year", "lastValue")
        VALUES (${year}, 1)
        ON CONFLICT ("year")
        DO UPDATE SET "lastValue" = "ReferenceCounter"."lastValue" + 1
        RETURNING "lastValue"
    `;

    const value = rows[0]?.lastValue ?? 1;

    return `BK-${year}-${String(value).padStart(6, "0")}`;
}

function normalizePhone(input: string): string {
    let digits = input.replace(/\D/g, "");

    if (digits.startsWith("63") && digits.length === 12) {
        digits = "0" + digits.slice(2);
    }

    return digits;
}

function getEvidenceUrl(storedName: string): string {
    const baseUrl = (
        process.env.PUBLIC_API_URL ?? "http://localhost:3000"
    ).replace(/\/+$/, "");

    return `${baseUrl}/uploads/${encodeURIComponent(storedName)}`;
}

const complaintService = {

    async create(input: CreateComplaintInput, files: Express.Multer.File[]): Promise<{ id: number; reference: string }> {
        const settings = await settingService.get();
        const deadlineDays = deadlineDaysFrom(settings);

        return prisma.$transaction(async (tx) => {
            const reference = await nextReference(tx, new Date().getFullYear());

            return tx.complaint.create({
                data: {
                    reference,

                    complainantName: input.complainantName,
                    complainantAge: Number(input.complainantAge),
                    complainantPurok: input.complainantPurok,
                    complainantContact: input.complainantContact,
                    contactNormalized: normalizePhone(input.complainantContact),
                    complainantEmail: input.complainantEmail,
                    complainantAddress: input.complainantAddress,

                    respondentName: input.respondentName,
                    respondentAddress: input.respondentAddress || null,
                    relationship: input.relationship || null,

                    complaintType: input.complaintType,
                    complaintTypeOther: input.complaintTypeOther,
                    incidentAt: new Date(input.incidentAt),
                    incidentPlace: input.incidentPlace,
                    narrative: input.narrative,

                    // KP clock starts at filing: summon the respondent within the configured days.
                    dueAt: computeNextDueAt("received", new Date(), deadlineDays),
                    consentAt: new Date(),

                    evidence: {
                        create: files.map((file) => ({
                            originalName: file.originalname,
                            storedName: file.filename,
                            mimeType: file.mimetype,
                            size: file.size,
                        })),
                    },

                    updates: {
                        create: {
                            status: "received",
                        },
                    },
                },
                select: {
                    id: true,
                    reference: true,
                },
            });
        });
    },

    async list(
        page: number,
        pageSize: number,
        filters: ComplaintListFilters = {},
    ): Promise<Paginated<ComplaintListRow>> {
        const conditions: Prisma.Sql[] = [];

        const q = filters.q?.trim();
        if (q) {
            const like = `%${q}%`;
            conditions.push(
                Prisma.sql`("reference" ILIKE ${like} OR "complainantName" ILIKE ${like} OR "respondentName" ILIKE ${like})`,
            );
        }

        if (
            filters.status &&
            (COMPLAINT_STATUSES as readonly string[]).includes(filters.status)
        ) {
            conditions.push(Prisma.sql`"status" = ${filters.status}`);
        }

        if (filters.type) {
            conditions.push(Prisma.sql`"complaintType" = ${filters.type}`);
        }

        if (
            filters.priority &&
            (COMPLAINT_PRIORITIES as readonly string[]).includes(filters.priority)
        ) {
            conditions.push(Prisma.sql`"priority" = ${filters.priority}`);
        }

        if (filters.open) {
            conditions.push(
                Prisma.sql`"status" IN ('received', 'summoned', 'mediation', 'conciliation')`,
            );
        }

        if (filters.overdue) {
            conditions.push(
                Prisma.sql`("dueAt" IS NOT NULL AND "dueAt" < NOW() AND "status" NOT IN ('settled', 'certified', 'dismissed'))`,
            );
        }

        if (filters.dueSoon) {
            conditions.push(
                Prisma.sql`("dueAt" IS NOT NULL AND "dueAt" >= NOW() AND "dueAt" <= NOW() + interval '3 days' AND "status" NOT IN ('settled', 'certified', 'dismissed'))`,
            );
        }

        const whereSql = conditions.length
            ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
            : Prisma.empty;

        const offset = (page - 1) * pageSize;

        const [items, countRows] = await Promise.all([
            // Newest filed first.
            prisma.$queryRaw<ComplaintListRow[]>`
                SELECT id, reference, "complainantName", "respondentName",
                       "complaintType", "complaintTypeOther", status, priority, "createdAt", "viewedAt", "dueAt"
                FROM "Complaint"
                ${whereSql}
                ORDER BY "createdAt" DESC, id DESC
                LIMIT ${pageSize} OFFSET ${offset}
            `,
            prisma.$queryRaw<{ count: number }[]>`
                SELECT COUNT(*)::int AS count FROM "Complaint" ${whereSql}
            `,
        ]);

        const total = countRows[0]?.count ?? 0;

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    },

    async markViewed(id: number): Promise<void> {
        // Only stamp the first time it's opened.
        await prisma.complaint.updateMany({
            where: { id, viewedAt: null },
            data: { viewedAt: new Date() },
        });
    },

    async getById(id: number): Promise<ComplaintDetail | null> {
        const complaint = await prisma.complaint.findUnique({
            where: { id },
            include: {
                updates: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        createdBy: {
                            select: {
                                fullName: true,
                                position: true,
                                role: true
                            },
                        },
                    },
                },
                evidence: {
                    orderBy: { createdAt: "desc" },
                },
                hearings: {
                    where: { status: "scheduled", scheduledAt: { gte: new Date() } },
                    orderBy: { scheduledAt: "asc" },
                    take: 1,
                    select: { scheduledAt: true, kind: true },
                },
            },
        });

        if (!complaint) {
            return null;
        }

        const latestUpdate = complaint.updates[0];
        const currentStatus = latestUpdate?.status ?? complaint.status;

        return {
            id: complaint.id,
            reference: complaint.reference,
            complainantName: complaint.complainantName,
            respondentName: complaint.respondentName,
            complaintType: complaint.complaintType,
            complaintTypeOther: complaint.complaintTypeOther,
            status: currentStatus,
            priority: complaint.priority,
            createdAt: complaint.createdAt.toISOString(),
            dueAt: complaint.dueAt ? complaint.dueAt.toISOString() : null,
            nextHearingAt: complaint.hearings[0]?.scheduledAt.toISOString() ?? null,
            nextHearingKind: complaint.hearings[0]?.kind ?? null,
            description: complaint.narrative,

            evidence: complaint.evidence.map((evidence) => ({
                originalName: evidence.originalName,
                url: getEvidenceUrl(evidence.storedName),
                mimeType: evidence.mimeType,
                size: evidence.size,
            })),

            history: complaint.updates.map((update) => ({
                status: update.status,
                date: update.createdAt.toISOString(),
                by: update.createdBy?.fullName ?? "System",
                ...(update.publicNote || update.internalNote
                    ? {
                        note: update.publicNote ?? update.internalNote!,
                    }
                    : {}),
                ...(update.hearingAt
                    ? {
                        hearingAt: update.hearingAt.toISOString(),
                    }
                    : {}),
            })),

            complainantAge: complaint.complainantAge,
            complainantPurok: complaint.complainantPurok,
            complainantContact: complaint.complainantContact,
            complainantEmail: complaint.complainantEmail,
            complainantAddress: complaint.complainantAddress,
            respondentAddress: complaint.respondentAddress,
            relationship: complaint.relationship,
            incidentAt: complaint.incidentAt.toISOString(),
            incidentPlace: complaint.incidentPlace,
        };
    },

    async track(reference: string, contact: string): Promise<ComplaintTrackResult | null> {
        const complaint = await prisma.complaint.findUnique({
            where: { reference },
            select: {
                reference: true,
                status: true,
                contactNormalized: true,
                updates: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        status: true,
                        publicNote: true,
                        hearingAt: true,
                        createdAt: true,
                    },
                },
            },
        });

        // Require the matching contact number so references can't be enumerated.
        if (!complaint || complaint.contactNormalized !== normalizePhone(contact)) {
            return null;
        }

        const latest = complaint.updates.at(-1);

        return {
            reference: complaint.reference,
            status: latest?.status ?? complaint.status,
            updates: complaint.updates.map((update) => ({
                status: update.status,
                publicNote: update.publicNote,
                hearingAt: update.hearingAt ? update.hearingAt.toISOString() : null,
                createdAt: update.createdAt.toISOString(),
            })),
        };
    },

    async updateStatus(id: number, status: string, publicNote?: string, internalNote?: string, hearingAt?: Date, userId?: number) {
        // Advance the KP clock whenever a case moves to a new step.
        const settings = await settingService.get();
        const dueAt = computeNextDueAt(status, new Date(), deadlineDaysFrom(settings));

        return prisma.$transaction(async (tx) => {
            await tx.complaint.update({
                where: { id },
                data: { status, dueAt },
            });

            // A date entered with a status change is a real mediation session:
            // mirror it into the Hearing table so the case view and the
            // mediation calendar stay in sync. Reschedule the next scheduled
            // session instead of piling up a new one each edit.
            if (hearingAt) {
                const kind = status === "conciliation" ? "conciliation" : "mediation";

                const existing = await tx.hearing.findFirst({
                    where: {
                        complaintId: id,
                        status: "scheduled",
                        scheduledAt: { gte: new Date() },
                    },
                    orderBy: { scheduledAt: "asc" },
                    select: { id: true, scheduledAt: true },
                });

                if (existing) {
                    if (existing.scheduledAt.getTime() !== hearingAt.getTime()) {
                        await tx.hearing.update({
                            where: { id: existing.id },
                            data: { scheduledAt: hearingAt, kind },
                        });
                    }
                } else {
                    await tx.hearing.create({
                        data: {
                            complaintId: id,
                            scheduledAt: hearingAt,
                            kind,
                            createdById: userId ?? null,
                        },
                    });
                }
            }

            return tx.statusUpdate.create({
                data: {
                    complaintId: id,
                    status,
                    publicNote: publicNote ?? null,
                    internalNote: internalNote ?? null,
                    hearingAt: hearingAt ?? null,
                    createdById: userId ?? null,
                },
            });
        });
    },

    async bulkUpdateStatus(ids: number[], status: string, userId?: number): Promise<number> {
        const settings = await settingService.get();
        const dueAt = computeNextDueAt(status, new Date(), deadlineDaysFrom(settings));

        return prisma.$transaction(async (tx) => {
            const { count } = await tx.complaint.updateMany({
                where: { id: { in: ids } },
                data: { status, dueAt },
            });

            await tx.statusUpdate.createMany({
                data: ids.map((id) => ({
                    complaintId: id,
                    status,
                    createdById: userId ?? null,
                })),
            });

            return count;
        });
    },

    async setPriority(id: number, priority: string): Promise<number> {
        const { count } = await prisma.complaint.updateMany({
            where: { id },
            data: { priority },
        });

        return count;
    },

    async reopenCase(id: number, reason: string, userId?: number) {
        const settings = await settingService.get();
        const dueAt = computeNextDueAt("received", new Date(), deadlineDaysFrom(settings));

        return prisma.$transaction(async (tx) => {
            await tx.complaint.update({
                where: { id },
                data: { status: "received", dueAt },
            });

            const historyData: any = {
                complaintId: id,
                status: "received",
                publicNote: `Case Reopened: ${reason}`,
            };

            if (userId) historyData.createdById = userId;

            await tx.statusUpdate.create({
                data: historyData,
            });
        });
    }
};

export default complaintService;
