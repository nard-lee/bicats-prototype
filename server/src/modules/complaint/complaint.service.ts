
import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { CustomError } from "../../utils/custom.exception.js";

import { COMPLAINT_STATUSES, TERMINAL_STATUSES, RISK_WINDOW_DAYS, canTransition, computeNextDueAt, deadlineConfigFrom, isComplaintStatus, isComplaintType } from "./complaint.schema.js";
import type { CreateComplaintInput } from "./complaint.schema.js";
import type { UpdateEligibilityInput } from "./complaint.eligibility.js";
import type { CreateServiceRecordInput, ServiceResult } from "./complaint.service-record.js";
import type {
    ComplaintDetail,
    ComplaintListFilters,
    ComplaintListRow,
    ComplaintStatus,
    ComplaintTrackResult,
    Paginated,
    PangkatMember,
} from "./complaint.types.js";
import { getEvidenceUrl, nextReference, normalizePhone } from "./complaint.helpers.js";
import settingService from "../setting/setting.service.js";
import notificationService from "../notification/notification.service.js";
import {
    assertNoConflict,
    assertNoDuplicateForComplaint,
    assertSchedulingAllowed,
} from "../hearing/hearing.helpers.js";

// Closing a case takes its booked sessions with it, and the complainant was
// promised those dates, so hand back enough to tell them what was cancelled.
async function cancelScheduledHearings(
    tx: Prisma.TransactionClient,
    complaintId: number,
): Promise<{ id: number; complaintId: number; kind: string }[]> {
    const hearings = await tx.hearing.findMany({
        where: { complaintId, status: "scheduled" },
        orderBy: { scheduledAt: "asc" },
        select: { id: true, kind: true },
    });

    if (hearings.length === 0) return [];

    await tx.hearing.updateMany({
        where: { id: { in: hearings.map((hearing) => hearing.id) } },
        data: { status: "cancelled" },
    });

    return hearings.map((hearing) => ({
        id: hearing.id,
        complaintId,
        kind: hearing.kind,
    }));
}

async function clearHearingNotifications(hearingIds: number[]): Promise<void> {
    for (const id of hearingIds) {
        await notificationService.clearByDedupePrefix(`hearing_overdue:${id}:`);
        await notificationService.clearByDedupePrefix(`hearing_upcoming:${id}:`);
    }
}

const complaintService = {

    async create(input: CreateComplaintInput, files: Express.Multer.File[]): Promise<{ id: number; reference: string }> {
        const settings = await settingService.get();

        if (!settings.puroks.includes(input.complainantPurok)) {
            throw new CustomError(
                "Choose a purok from the barangay's list",
                { complainantPurok: "Select a purok from the list" },
                400,
            );
        }

        const deadlines = deadlineConfigFrom(settings);

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
                    dueAt: computeNextDueAt("received", new Date(), deadlines),
                    consentAt: new Date(),

                    eligibilityStatus: input.eligibilityStatus,
                    eligibilityAnswers: input.eligibilityAnswers as Prisma.InputJsonValue,

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
        const conditions: Prisma.ComplaintWhereInput[] = [];

        const q = filters.q?.trim();
        if (q) {
            conditions.push({
                OR: [
                    { reference: { contains: q, mode: "insensitive" } },
                    { complainantName: { contains: q, mode: "insensitive" } },
                    { respondentName: { contains: q, mode: "insensitive" } },
                ],
            });
        }

        if (filters.status && isComplaintStatus(filters.status)) {
            conditions.push({ status: filters.status });
        }

        if (filters.type && isComplaintType(filters.type)) {
            conditions.push({ complaintType: filters.type });
        }

        if (filters.open) {
            conditions.push({
                status: {
                    in: COMPLAINT_STATUSES.filter(
                        (status) => !TERMINAL_STATUSES.includes(status),
                    ),
                },
            });
        }

        const now = new Date();

        if (filters.overdue) {
            conditions.push({
                dueAt: { not: null, lt: now },
                status: { notIn: [...TERMINAL_STATUSES] },
            });
        }

        if (filters.dueSoon) {
            conditions.push({
                dueAt: {
                    not: null,
                    gte: now,
                    lte: new Date(now.getTime() + RISK_WINDOW_DAYS * 24 * 60 * 60 * 1000),
                },
                status: { notIn: [...TERMINAL_STATUSES] },
            });
        }

        const where: Prisma.ComplaintWhereInput = conditions.length
            ? { AND: conditions }
            : {};
        const offset = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
            prisma.complaint.findMany({
                where,
                select: {
                    id: true,
                    reference: true,
                    complainantName: true,
                    respondentName: true,
                    complaintType: true,
                    complaintTypeOther: true,
                    status: true,
                    createdAt: true,
                    viewedAt: true,
                    dueAt: true,
                },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip: offset,
                take: pageSize,
            }),
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
                hearings: {
                    where: { status: "scheduled", scheduledAt: { gte: new Date() } },
                    orderBy: { scheduledAt: "asc" },
                    take: 1,
                    select: { scheduledAt: true, kind: true },
                },
                serviceRecords: {
                    orderBy: { servedAt: "desc" },
                    include: {
                        createdBy: { select: { fullName: true } },
                    },
                },
            },
        });

        if (!complaint) {
            return null;
        }

        // Adjacent cases in the list's default order (newest first).
        const [newer, older] = await Promise.all([
            prisma.complaint.findFirst({
                where: {
                    OR: [
                        { createdAt: { gt: complaint.createdAt } },
                        { createdAt: complaint.createdAt, id: { gt: complaint.id } },
                    ],
                },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: { id: true },
            }),
            prisma.complaint.findFirst({
                where: {
                    OR: [
                        { createdAt: { lt: complaint.createdAt } },
                        { createdAt: complaint.createdAt, id: { lt: complaint.id } },
                    ],
                },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                select: { id: true },
            }),
        ]);

        const latestUpdate = complaint.updates[0];
        const currentStatus = latestUpdate?.status ?? complaint.status;

        const serviceResultLabel: Record<ServiceResult, string> = {
            received: "Summons received",
            refused: "Summons refused",
            not_found: "Respondent not found at the given address",
        };

        const statusHistory = complaint.updates.map((update) => ({
            kind: "status" as const,
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
        }));

        const serviceHistory = complaint.serviceRecords.map((record) => {
            const result = record.result as ServiceResult;
            const note = `${serviceResultLabel[result]} by ${record.serverName}.`;

            return {
                kind: "service" as const,
                status: "service",
                date: record.servedAt.toISOString(),
                by: record.createdBy?.fullName ?? "System",
                note: record.notes ? `${note} ${record.notes}` : note,
                serviceResult: result,
                serverName: record.serverName,
            };
        });

        const history = [...statusHistory, ...serviceHistory].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        const pangkatMembers =
            (complaint.pangkatMembers as PangkatMember[] | null) ?? [];
        const pangkatChairman =
            pangkatMembers.find((member) => member.isChairman)?.fullName ??
            complaint.pangkatChairman;

        return {
            id: complaint.id,
            reference: complaint.reference,
            prevId: newer?.id ?? null,
            nextId: older?.id ?? null,
            complainantName: complaint.complainantName,
            respondentName: complaint.respondentName,
            complaintType: complaint.complaintType,
            complaintTypeOther: complaint.complaintTypeOther,
            status: currentStatus,
            createdAt: complaint.createdAt.toISOString(),
            dueAt: complaint.dueAt ? complaint.dueAt.toISOString() : null,
            nextHearingAt: complaint.hearings[0]?.scheduledAt.toISOString() ?? null,
            nextHearingKind: complaint.hearings[0]?.kind ?? null,
            description: complaint.narrative,

            eligibilityStatus: complaint.eligibilityStatus as ComplaintDetail["eligibilityStatus"],
            eligibilityAnswers: complaint.eligibilityAnswers as ComplaintDetail["eligibilityAnswers"],
            eligibilityNotes: complaint.eligibilityNotes,
            eligibilityReason: complaint.eligibilityReason,
            eligibilityReviewedAt:
                complaint.eligibilityReviewedAt?.toISOString() ?? null,
            pangkatMembers,
            pangkatChairman,

            evidence: complaint.evidence.map((evidence) => ({
                originalName: evidence.originalName,
                url: getEvidenceUrl(evidence.storedName),
                mimeType: evidence.mimeType,
                size: evidence.size,
            })),

            serviceRecords: complaint.serviceRecords.map((record) => ({
                id: record.id,
                servedAt: record.servedAt.toISOString(),
                serverName: record.serverName,
                result: record.result as ServiceResult,
                notes: record.notes,
                createdBy: record.createdBy?.fullName ?? null,
                createdAt: record.createdAt.toISOString(),
            })),

            history,

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

    async updateStatus(id: number, status: ComplaintStatus, publicNote?: string, internalNote?: string, hearingAt?: Date, userId?: number) {
        const settings = await settingService.get();
        const deadlines = deadlineConfigFrom(settings);

        const result = await prisma.$transaction(async (tx) => {
            const previous = await tx.complaint.findUnique({
                where: { id },
                select: { reference: true, status: true, dueAt: true, eligibilityStatus: true },
            });

            if (!previous) {
                throw new CustomError("Complaint not found", undefined, 404);
            }

            if (previous.eligibilityStatus === "needs_review") {
                throw new CustomError(
                    "This case is pending an eligibility review. Resolve the review before changing its status.",
                    undefined,
                    409,
                );
            }

            if (previous.eligibilityStatus === "unreviewed") {
                throw new CustomError(
                    "This case has not been screened for KP eligibility. Complete the eligibility review before changing its status.",
                    undefined,
                    409,
                );
            }

            const changingStatus = status !== previous.status;

            if (changingStatus && !canTransition(previous.status, status)) {
                throw new CustomError(
                    TERMINAL_STATUSES.includes(
                        previous.status as (typeof TERMINAL_STATUSES)[number],
                    )
                        ? "This case is closed. Reopen it before changing its status."
                        : `A case can't move from "${previous.status}" to "${status}".`,
                    undefined,
                    409,
                );
            }

            // A note-only save keeps the current step's clock running.
            const dueAt = changingStatus
                ? computeNextDueAt(status, new Date(), deadlines)
                : previous.dueAt;
            const closing =
                changingStatus &&
                TERMINAL_STATUSES.includes(
                    status as (typeof TERMINAL_STATUSES)[number],
                );
            const hearingDate = closing ? null : hearingAt ?? null;

            await tx.complaint.update({
                where: { id },
                data: {
                    status,
                    dueAt,
                },
            });

            const cancelledHearings = closing
                ? await cancelScheduledHearings(tx, id)
                : [];
            let hearingChanged = false;

            if (hearingDate) {
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
                    if (existing.scheduledAt.getTime() !== hearingDate.getTime()) {
                        assertSchedulingAllowed(hearingDate, settings);
                        await assertNoDuplicateForComplaint(
                            id,
                            hearingDate,
                            existing.id,
                            tx,
                        );
                        await assertNoConflict(
                            hearingDate,
                            settings.hearingDurationMinutes,
                            existing.id,
                            tx,
                        );
                        await tx.hearing.update({
                            where: { id: existing.id },
                            data: { scheduledAt: hearingDate, kind },
                        });
                        hearingChanged = true;
                    }
                } else {
                    assertSchedulingAllowed(hearingDate, settings);
                    await assertNoDuplicateForComplaint(id, hearingDate, undefined, tx);
                    await assertNoConflict(
                        hearingDate,
                        settings.hearingDurationMinutes,
                        undefined,
                        tx,
                    );
                    await tx.hearing.create({
                        data: {
                            complaintId: id,
                            scheduledAt: hearingDate,
                            kind,
                            location: settings.defaultHearingLocation || null,
                            createdById: userId ?? null,
                        },
                    });
                    hearingChanged = true;
                }
            }

            const hasNotes = !!publicNote || !!internalNote;
            const entry =
                changingStatus || hasNotes || hearingChanged
                    ? await tx.statusUpdate.create({
                          data: {
                              complaintId: id,
                              status,
                              publicNote: publicNote ?? null,
                              internalNote: internalNote ?? null,
                              hearingAt: hearingDate,
                              createdById: userId ?? null,
                          },
                      })
                    : null;

            return {
                reference: previous.reference,
                previousStatus: previous.status,
                entry,
                cancelledHearings,
            };
        });

        await clearHearingNotifications(
            result.cancelledHearings.map((hearing) => hearing.id),
        );
        return result;
    },

    async addServiceRecord(id: number, input: CreateServiceRecordInput, userId?: number) {
        const settings = await settingService.get();
        const deadlines = deadlineConfigFrom(settings);

        return prisma.$transaction(async (tx) => {
            const complaint = await tx.complaint.findUnique({
                where: { id },
                select: { reference: true, status: true, dueAt: true },
            });

            if (!complaint) {
                throw new CustomError("Complaint not found", undefined, 404);
            }

            if (
                TERMINAL_STATUSES.includes(
                    complaint.status as (typeof TERMINAL_STATUSES)[number],
                )
            ) {
                throw new CustomError(
                    "This case is closed. Proof of service can no longer be recorded.",
                    undefined,
                    409,
                );
            }

            const record = await tx.serviceRecord.create({
                data: {
                    complaintId: id,
                    servedAt: input.servedAt,
                    serverName: input.serverName,
                    result: input.result,
                    notes: input.notes,
                    createdById: userId ?? null,
                },
            });

            let dueAt = complaint.dueAt;
            let deadlineUpdated = false;

            // A received summons starts the mediation clock from the service date.
            if (input.result === "received" && complaint.status === "summoned") {
                dueAt = computeNextDueAt("summoned", input.servedAt, deadlines);
                await tx.complaint.update({ where: { id }, data: { dueAt } });
                deadlineUpdated = true;
            }

            return { reference: complaint.reference, record, dueAt, deadlineUpdated };
        });
    },

    async bulkUpdateStatus(
        ids: number[],
        status: ComplaintStatus,
        userId?: number,
    ): Promise<{
        count: number;
        cancelledHearings: { id: number; complaintId: number; kind: string }[];
    }> {
        const settings = await settingService.get();
        const deadlines = deadlineConfigFrom(settings);

        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.complaint.findMany({
                where: { id: { in: ids } },
                select: { id: true, reference: true, status: true, eligibilityStatus: true },
            });

            const held = existing.filter(
                (row) =>
                    row.eligibilityStatus === "needs_review" ||
                    row.eligibilityStatus === "unreviewed",
            );

            if (held.length > 0) {
                const refs = held.slice(0, 3).map((row) => row.reference).join(", ");
                const more = held.length > 3 ? ` and ${held.length - 3} more` : "";
                throw new CustomError(
                    `Eligibility has not been resolved for ${refs}${more}. Complete the eligibility review before changing status.`,
                    undefined,
                    409,
                );
            }

            const changing = existing.filter((row) => row.status !== status);
            const invalid = changing.filter((row) => !canTransition(row.status, status));

            if (invalid.length > 0) {
                const refs = invalid.slice(0, 3).map((row) => row.reference).join(", ");
                const more = invalid.length > 3 ? ` and ${invalid.length - 3} more` : "";
                throw new CustomError(
                    `Can't move ${refs}${more} to "${status}" from their current stage.`,
                    undefined,
                    409,
                );
            }

            if (changing.length === 0) {
                return {
                    count: 0,
                    cancelledHearings: [] as {
                        id: number;
                        complaintId: number;
                        kind: string;
                    }[],
                };
            }

            const targetIds = changing.map((row) => row.id);
            const dueAt = computeNextDueAt(status, new Date(), deadlines);
            const closing = TERMINAL_STATUSES.includes(
                status as (typeof TERMINAL_STATUSES)[number],
            );

            await tx.complaint.updateMany({
                where: { id: { in: targetIds } },
                data: {
                    status,
                    dueAt,
                },
            });

            await tx.statusUpdate.createMany({
                data: targetIds.map((id) => ({
                    complaintId: id,
                    status,
                    createdById: userId ?? null,
                })),
            });

            const cancelledHearings: {
                id: number;
                complaintId: number;
                kind: string;
            }[] = [];
            if (closing) {
                for (const row of changing) {
                    cancelledHearings.push(
                        ...(await cancelScheduledHearings(tx, row.id)),
                    );
                }
            }

            return { count: targetIds.length, cancelledHearings };
        });

        await clearHearingNotifications(
            result.cancelledHearings.map((hearing) => hearing.id),
        );
        return result;
    },

    async reopenCase(id: number, reason: string, userId?: number) {
        const settings = await settingService.get();
        const dueAt = computeNextDueAt("received", new Date(), deadlineConfigFrom(settings));

        return prisma.$transaction(async (tx) => {
            const existing = await tx.complaint.findUnique({
                where: { id },
                select: { id: true, status: true },
            });

            if (!existing) {
                throw new CustomError("Complaint not found", undefined, 404);
            }

            if (
                !TERMINAL_STATUSES.includes(
                    existing.status as (typeof TERMINAL_STATUSES)[number],
                )
            ) {
                throw new CustomError(
                    "Only closed cases can be reopened.",
                    undefined,
                    409,
                );
            }

            const updated = await tx.complaint.update({
                where: { id },
                data: { status: "received", dueAt },
                select: { reference: true },
            });

            // Reopen reasons can be sensitive; keep them staff-only rather than
            // publishing them through the public tracker.
            const historyData: any = {
                complaintId: id,
                status: "received",
                internalNote: `Case Reopened: ${reason}`,
            };

            if (userId) historyData.createdById = userId;

            await tx.statusUpdate.create({
                data: historyData,
            });

            return { reference: updated.reference };
        });
    },

    async updatePangkat(id: number, memberIds: number[], chairmanId: number) {
        const existing = await prisma.complaint.findUnique({
            where: { id },
            select: {
                reference: true,
                status: true,
                pangkatMembers: true,
                pangkatChairman: true,
            },
        });

        if (!existing) {
            throw new CustomError("Complaint not found", undefined, 404);
        }

        if (
            TERMINAL_STATUSES.includes(
                existing.status as (typeof TERMINAL_STATUSES)[number],
            )
        ) {
            throw new CustomError(
                "This case is closed. Reopen it before changing the Pangkat.",
                undefined,
                409,
            );
        }

        // Mediation is the Punong Barangay's; the Pangkat is constituted only
        // when the case moves on to conciliation.
        if (existing.status !== "conciliation") {
            throw new CustomError(
                "The Pangkat is only assigned once the case reaches conciliation.",
                undefined,
                409,
            );
        }

        // A duplicate, inactive, or unknown id leaves fewer than three rows.
        const members = await prisma.luponMember.findMany({
            where: { id: { in: memberIds }, isActive: true },
            select: { id: true, fullName: true },
        });

        if (members.length !== 3) {
            throw new CustomError(
                "Pick three active Lupon members.",
                undefined,
                400,
            );
        }

        const byId = new Map(members.map((member) => [member.id, member]));
        const chairman = byId.get(chairmanId);

        if (!chairman) {
            throw new CustomError(
                "The chairman must be one of the three selected members.",
                undefined,
                400,
            );
        }

        // Snapshot the names so a later roster rename never rewrites the case.
        const panel: PangkatMember[] = [
            { id: chairman.id, fullName: chairman.fullName, isChairman: true },
            ...memberIds
                .filter((memberId) => memberId !== chairmanId)
                .map((memberId) => {
                    const member = byId.get(memberId)!;
                    return {
                        id: member.id,
                        fullName: member.fullName,
                        isChairman: false,
                    };
                }),
        ];

        const previousPanel =
            (existing.pangkatMembers as PangkatMember[] | null) ?? [];
        const previousChairman =
            previousPanel.find((member) => member.isChairman)?.fullName ??
            existing.pangkatChairman;

        const updated = await prisma.complaint.update({
            where: { id },
            data: {
                pangkatMembers: panel,
                pangkatChairman: chairman.fullName,
            },
            select: { reference: true },
        });

        return {
            reference: updated.reference,
            panel,
            previousChairman,
        };
    },

    async reviewEligibility(id: number, input: UpdateEligibilityInput, userId?: number) {
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.complaint.findUnique({
                where: { id },
                select: { reference: true, status: true, eligibilityStatus: true },
            });

            if (!existing) {
                throw new CustomError("Complaint not found", undefined, 404);
            }

            if (
                TERMINAL_STATUSES.includes(
                    existing.status as (typeof TERMINAL_STATUSES)[number],
                )
            ) {
                throw new CustomError(
                    "This case is closed. Reopen it before changing its eligibility.",
                    undefined,
                    409,
                );
            }

            const dismiss =
                input.eligibilityStatus === "outside_kp" ||
                input.eligibilityStatus === "rejected";

            const dismissalNote = !dismiss
                ? null
                : input.eligibilityStatus === "rejected"
                    ? `Complaint rejected: ${input.eligibilityReason}`
                    : "Case dismissed: the complaint falls outside the authority of the Katarungang Pambarangay.";

            // Eligibility is a screening gate, not a stage move: a case found
            // outside KP authority closes from whatever open stage it reached,
            // so this dismissal deliberately does not consult COMPLAINT_TRANSITIONS.
            await tx.complaint.update({
                where: { id },
                data: {
                    eligibilityStatus: input.eligibilityStatus,
                    eligibilityNotes: input.eligibilityNotes,
                    eligibilityReason: input.eligibilityReason,
                    eligibilityReviewedAt: new Date(),
                    ...(dismiss
                        ? { status: "dismissed", dueAt: null }
                        : {}),
                },
            });

            const cancelledHearings: {
                id: number;
                complaintId: number;
                kind: string;
            }[] = [];

            if (dismiss) {
                if (dismissalNote) {
                    await tx.statusUpdate.create({
                        data: {
                            complaintId: id,
                            status: "dismissed",
                            publicNote: dismissalNote,
                            internalNote: input.eligibilityNotes ?? null,
                            createdById: userId ?? null,
                        },
                    });
                }

                cancelledHearings.push(...(await cancelScheduledHearings(tx, id)));
            }

            return {
                reference: existing.reference,
                previousStatus: existing.eligibilityStatus,
                previousComplaintStatus: existing.status,
                dismissed: dismiss,
                dismissalNote,
                cancelledHearings,
            };
        });

        await clearHearingNotifications(
            result.cancelledHearings.map((hearing) => hearing.id),
        );
        return result;
    }
};

export default complaintService;
