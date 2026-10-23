import ky from "ky";

let tokenPromise: Promise<string> | null = null;

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1_000;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchToken(): Promise<string> {
    return ky
        .get("/api/csrf-token", { credentials: "include" })
        .json<{ csrfToken: string }>()
        .then((r) => r.csrfToken);
}

export function getCsrfToken(): Promise<string> {
    if (!tokenPromise) {
        tokenPromise = (async () => {
            let lastError: unknown;
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    return await fetchToken();
                } catch (err) {
                    lastError = err;
                    const status =
                        (err as { response?: { status?: number } }).response?.status ?? 0;
                    if (status > 0 && status < 500) throw err;
                    if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS);
                }
            }
            throw lastError;
        })().catch((err) => {
            tokenPromise = null;
            throw err;
        });
    }
    return tokenPromise;
}

export function resetCsrfToken(): void {
    tokenPromise = null;
}
