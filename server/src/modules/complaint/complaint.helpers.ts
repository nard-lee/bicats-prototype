import type { Prisma } from "../../generated/prisma/client.js";
import { storageEnabled } from "../../utils/storage.js";

export { normalizePhone } from "./complaint.schema.js";

// A case number is YY-MM-NNNN and the serial restarts at 0001 each month.
// A reference alone opens nothing: tracking also has to match the
// complainant's contact number, and the endpoint is rate limited.
export function referencePeriod(date: Date): string {
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

export function formatReference(period: string, value: number): string {
    return `${period}-${String(value).padStart(4, "0")}`;
}

// The upsert runs inside the complaint transaction so two concurrent filings
// can never share a sequence number.
export async function nextReference(tx: Prisma.TransactionClient, period: string): Promise<string> {
    const rows = await tx.$queryRaw<{ lastValue: number }[]>`
        INSERT INTO "ReferenceCounter" ("period", "lastValue")
        VALUES (${period}, 1)
        ON CONFLICT ("period")
        DO UPDATE SET "lastValue" = "ReferenceCounter"."lastValue" + 1
        RETURNING "lastValue"
    `;

    const value = rows[0]?.lastValue ?? 1;

    return formatReference(period, value);
}

export function getEvidenceUrl(storedName: string): string {
    // Bucket objects stream through the API so stored names stay stable
    // (the same-origin client resolves the relative path either directly
    // or through the Vite dev proxy).
    if (storageEnabled()) {
        return `/api/assets/${encodeURIComponent(storedName)}`;
    }

    const baseUrl = (
        process.env.PUBLIC_API_URL ?? "http://localhost:3000"
    ).replace(/\/+$/, "");

    return `${baseUrl}/uploads/${encodeURIComponent(storedName)}`;
}
