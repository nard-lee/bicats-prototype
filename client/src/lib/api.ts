import ky from "ky";
import { getCsrfToken } from "./csrf";

let refreshPromise: Promise<unknown> | null = null;

function refreshAccessToken() {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const token = await getCsrfToken();
            return ky.post("/api/auth/refresh", {
                credentials: "include",
                headers: { "X-CSRF-Token": token },
            });
        })().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

const pristine = new WeakMap<Request, Request>();

export const api = ky.create({
    prefix: "/api",
    credentials: "include",
    hooks: {
        beforeRequest: [
            async ({ request }) => {
                const token = await getCsrfToken();
                request.headers.set("X-CSRF-Token", token);
                pristine.set(request, request.clone());
            },
        ],
        afterResponse: [
            async ({ request, response }) => {
                if (response.status !== 401) return;
                if (
                    request.url.includes("/auth/refresh") ||
                    request.url.includes("/auth/log-in")
                ) return;

                try {
                    await refreshAccessToken();
                } catch {
                    return;
                }

                const retry = pristine.get(request) ?? request;
                return ky(retry, { credentials: "include" });
            },
        ],
    },
});