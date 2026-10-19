import { api } from "@/lib/api";

export type ProfileUser = {
  id: number;
  fullName: string;
  position: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
};

export async function ProfileLoader() {
  return api.get("auth/me").json<ProfileUser>();
}
