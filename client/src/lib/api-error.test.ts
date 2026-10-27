import { describe, expect, it } from "vitest";
import { HTTPError } from "ky";
import { readErrorMessage } from "./api-error";

const FALLBACK = "Could not save.";

// ky throws HTTPError after populating `data` from the response body, which also
// consumes the stream — so the body is never re-readable in an error handler.
function httpError(body: unknown) {
    const response = new Response(
        typeof body === "string" ? body : JSON.stringify(body),
        { status: 400, headers: { "content-type": "application/json" } },
    );
    const error = new HTTPError(response, new Request("http://localhost/api/x"), {} as never);
    (error as { data?: unknown }).data = body;
    return error;
}

describe("readErrorMessage", () => {
    it("shows the server's own failure message", () => {
        const error = httpError({ message: "Unsupported image type. Allowed: JPG, PNG, WEBP." });
        expect(readErrorMessage(error, FALLBACK)).toBe("Unsupported image type. Allowed: JPG, PNG, WEBP.");
    });

    it("prefers a field issue over the generic validation message", () => {
        const error = httpError({
            message: "Validation failed",
            fields: { eligibilityReason: "Reason required when rejecting a case." },
        });
        expect(readErrorMessage(error, FALLBACK)).toBe("Reason required when rejecting a case.");
    });

    it("falls back for an empty or unreadable body", () => {
        expect(readErrorMessage(httpError({ message: "   " }), FALLBACK)).toBe(FALLBACK);
        const error = httpError(undefined);
        expect(readErrorMessage(error, FALLBACK)).toBe(FALLBACK);
    });

    it("falls back for anything that is not an HTTP error", () => {
        expect(readErrorMessage(new Error("offline"), FALLBACK)).toBe(FALLBACK);
        expect(readErrorMessage("boom", FALLBACK)).toBe(FALLBACK);
    });
});
