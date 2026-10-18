import { prisma } from "@/db.js";
import { CustomError } from "@/utils/custom.exception.js";
import type {
  CreateNoticeInput,
  UpdateNoticeInput,
  NoticeRow,
  Paginated,
} from "./notice.schema.js";

async function ensureNoticeExists(id: number): Promise<void> {
  const notice = await prisma.notice.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!notice) throw new CustomError("Notice not found", undefined, 404);
}

export const noticeService = {
  async list(
    page: number,
    pageSize: number,
    publishedOnly = false,
  ): Promise<Paginated<NoticeRow>> {
    const where = publishedOnly ? { isPublished: true } : {};

    const [items, total] = await prisma.$transaction([
      prisma.notice.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { createdBy: { select: { fullName: true } } },
      }),
      prisma.notice.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async create(data: CreateNoticeInput, userId?: number): Promise<NoticeRow> {
    return prisma.notice.create({
      data: {
        title: data.title,
        body: data.body,
        isPublished: data.isPublished,
        ...(userId ? { createdById: userId } : {}),
      },
      include: { createdBy: { select: { fullName: true } } },
    });
  },

  async update(id: number, data: UpdateNoticeInput): Promise<NoticeRow> {
    await ensureNoticeExists(id);

    return prisma.notice.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      },
      include: { createdBy: { select: { fullName: true } } },
    });
  },

  async remove(id: number): Promise<void> {
    await ensureNoticeExists(id);
    await prisma.notice.delete({ where: { id } });
  },
};
