import { api } from "@/lib/api";

type PublicNotice = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
};

type PublicNoticesResponse = {
  items: PublicNotice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type HomeData = PublicNoticesResponse & {
  luponMembers: string[];
};

const emptyNotices: PublicNoticesResponse = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 3,
  totalPages: 1,
};

export async function HomeLoader(): Promise<HomeData> {
  const [notices, roster] = await Promise.all([
    api
      .get("/notices/list", { searchParams: { pageSize: 3 } })
      .json<PublicNoticesResponse>()
      .catch(() => emptyNotices),
    api
      .get("/lupon-members/public")
      .json<{ items: string[] }>()
      .catch(() => ({ items: [] })),
  ]);

  return { ...notices, luponMembers: roster.items };
}
