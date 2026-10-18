import { getCurrentUser } from "@/hooks/use-auth";

export async function RootLoader() {
    const user = await getCurrentUser();
    return user;
}