import { api } from "@/lib/api";
import { clearBootstrap } from "@/lib/bootstrap";
import { HTTPError } from "ky";

export type CurrentUser = {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
};

async function fetchCurrentUser(): Promise<CurrentUser | null> {
    try {
        return await api.get("auth/me").json<CurrentUser>();
    } catch (err) {
        if (err instanceof HTTPError && err.response.status === 401) return null;
        throw err;
    }
}

let userPromise: Promise<CurrentUser | null> | null = null;

export function getCurrentUser(): Promise<CurrentUser | null> {
    if (!userPromise) {
        userPromise = fetchCurrentUser().catch((err) => {
            userPromise = null;
            throw err;
        });
    }
    return userPromise;
}

export function clearCurrentUser() {
    userPromise = null;
    clearBootstrap();
}