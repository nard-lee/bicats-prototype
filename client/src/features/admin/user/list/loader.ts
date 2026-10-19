import { redirect, type LoaderFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/hooks/use-auth";
import type { Role } from "@/lib/roles";

export type StaffUser = {
  id: number;
  fullName: string;
  position: string;
  email: string;
  phone: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function UsersLoader({ request }: LoaderFunctionArgs) {
  const current = await getCurrentUser();
  if (!current) throw redirect("/login");
  if (current.role !== "admin") throw redirect("/admin");

  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page")) || 1;
  const role = params.get("role") ?? "";
  const isActive = params.get("isActive") ?? "";

  return api
    .get("/users", {
      searchParams: {
        page,
        limit: 20,
        ...(role && role !== "all" ? { role } : {}),
        ...(isActive && isActive !== "all" ? { isActive } : {}),
      },
    })
    .json<Paginated<StaffUser>>();
}
