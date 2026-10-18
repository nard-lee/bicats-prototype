
import { randomInt } from "node:crypto";
import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";

import { COMPLAINT_STATUSES } from "./complaint.schema.js";
import type {
    ComplaintDetail,
    ComplaintListFilters,
    ComplaintListRow,
    ComplaintStatus,
    ComplaintTrackResult,
    CreateComplaintInput,
    Paginated,
} from "./complaint.schema.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeReference(): string {
    let code = "";

    for (let i = 0; i < 6; i++) {
        code += ALPHABET[randomInt(ALPHABET.length)];
    }

    return `BK-${new Date().getFullYear()}-${code}`;
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

    async create(input: CreateComplaintInput, files: Express.Multer.File[]): Promise<{ reference: string }> {
        return prisma.complaint.create({
            data: {
                reference: makeReference(),

                complainantName: input.complainantName,
                complainantAge: Number(input.complainantAge),
                complainantPurok: input.complainantPurok,
                complainantContact: input.complainantContact,
                contactNormalized: normalizePhone(input.complainantContact),
                complainantAddress: input.complainantAddress,

                respondentName: input.respondentName,
                respondentAddress: input.respondentAddress || null,
                relationship: input.relationship || null,

                complaintType: input.complaintType,
                incidentAt: new Date(input.incidentAt),
                incidentPlace: input.incidentPlace,
                narrative: input.narrative,

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
                reference: true,
            },
        });
    },

    async list(
        page: number,
        pageSize: number,
        filters: ComplaintListFilters = {},
    ): Promise<Paginated<ComplaintListRow>> {
        const where: Prisma.ComplaintWhereInput = {};
        const conditions: Prisma.Sql[] = [];

        const q = filters.q?.trim();
        if (q) {
            where.OR = [
                { reference: { contains: q, mode: "insensitive" } },
                { complainantName: { contains: q, mode: "insensitive" } },
                { respondentName: { contains: q, mode: "insensitive" } },
            ];

            const like = `%${q}%`;
            conditions.push(
                Prisma.sql`("reference" ILIKE ${like} OR "complainantName" ILIKE ${like} OR "respondentName" ILIKE ${like})`,
            );
        }

        if (
            filters.status &&
            (COMPLAINT_STATUSES as readonly string[]).includes(filters.status)
        ) {
            where.status = filters.status as ComplaintStatus;
            conditions.push(Prisma.sql`"status" = ${filters.status}`);
        }

        if (filters.type) {
            where.complaintType = filters.type;
            conditions.push(Prisma.sql`"complaintType" = ${filters.type}`);
        }

        const whereSql = conditions.length
            ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
            : Prisma.empty;

        const offset = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
            // New (unopened) cases float to the top, then most recently updated.
            prisma.$queryRaw<ComplaintListRow[]>`
                SELECT id, reference, "complainantName", "respondentName",
                       "complaintType", status, "createdAt", "viewedAt"
                FROM "Complaint"
                ${whereSql}
                ORDER BY ("viewedAt" IS NULL) DESC, "updatedAt" DESC, id DESC
                LIMIT ${pageSize} OFFSET ${offset}
            `,
            prisma.complaint.count({ where }),
        ]);

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
            status: currentStatus,
            createdAt: complaint.createdAt.toISOString(),
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
        return prisma.$transaction(async (tx) => {
            await tx.complaint.update({
                where: { id },
                data: { status },
            });

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

    async reopenCase(id: number, reason: string, userId?: number) {
        return prisma.$transaction(async (tx) => {
            await tx.complaint.update({
                where: { id },
                data: { status: "received" },
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
