import { redirect } from "react-router";
import { getCurrentUser } from "@/hooks/use-auth";
import { INTERNAL_ROLES } from "@/lib/roles";

export async function AdminLoader() {
  const user = await getCurrentUser();
  if (!user) throw redirect("/login");
  if (!(INTERNAL_ROLES as string[]).includes(user.role)) throw redirect("/");
  return user;
}

export async function AdminOnlyLoader() {
  const user = await getCurrentUser();
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/admin");
  return null;
}
