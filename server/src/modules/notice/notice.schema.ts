import { z } from "zod";

export const createNoticeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  body: z.string().trim().min(1, "Content is required").max(10_000),
  isPublished: z.boolean().default(true),
});

export const updateNoticeSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(255),
    body: z.string().trim().min(1, "Content is required").max(10_000),
    isPublished: z.boolean(),
  })
  .partial();

export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;

export type NoticeRow = {
  id: number;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: Date;
  createdBy: { fullName: string } | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
