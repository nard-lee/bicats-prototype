import { api } from "@/lib/api";

export type PublicNotice = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
};

export type PublicNoticesResponse = {
  items: PublicNotice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function HomeLoader(): Promise<PublicNoticesResponse> {
  try {
    return await api
      .get("/notices/list", { searchParams: { pageSize: 3 } })
      .json<PublicNoticesResponse>();
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 3, totalPages: 1 };
  }
}
