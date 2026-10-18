import type { LoaderFunctionArgs } from "react-router";
import { api } from "@/lib/api";

export type NoticeItem = {
  id: number;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: string;
  createdBy: { fullName: string } | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function NoticesLoader({ request }: LoaderFunctionArgs) {
  const page = Number(new URL(request.url).searchParams.get("page")) || 1;

  return api
    .get("/notices/admin/list", { searchParams: { page, pageSize: 12 } })
    .json<Paginated<NoticeItem>>();
}
