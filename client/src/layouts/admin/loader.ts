import { redirect } from "react-router";
import { getCurrentUser } from "@/hooks/use-auth";

export async function AdminLoader() {
  const user = await getCurrentUser();
  if (!user) throw redirect("/login");
  if (user.role !== "admin" && user.role !== "staff") throw redirect("/");
  return user;
}

export async function AdminOnlyLoader() {
  const user = await getCurrentUser();
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/admin");
  return null;
}
