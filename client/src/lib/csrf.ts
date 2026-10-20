import ky from "ky";

let tokenPromise: Promise<string> | null = null;

export function getCsrfToken(): Promise<string> {
    if (!tokenPromise) {
        tokenPromise = ky
            .get("/api/csrf-token", { credentials: "include" })
            .json<{ csrfToken: string }>()
            .then((r) => r.csrfToken)
            .catch((err) => {
                tokenPromise = null;
                throw err;
            });
    }
    return tokenPromise;
}
