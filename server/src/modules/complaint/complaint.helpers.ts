import { randomInt } from "node:crypto";

import type { Prisma } from "../../generated/prisma/client.js";

export { normalizePhone } from "./complaint.schema.js";

// Atomically reserves the next number for the year and formats it as
// BK-<year>-000001-<check>. The two random check characters keep public
// tracking codes from being enumerated (they must be learned, not guessed).
// The upsert runs inside the complaint transaction so two concurrent filings
// can never share a sequence number.
const CHECK_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // unambiguous chars

function randomChar(): string {
    return CHECK_ALPHABET.charAt(randomInt(CHECK_ALPHABET.length));
}

function checkSuffix(): string {
    return randomChar() + randomChar();
}

export async function nextReference(tx: Prisma.TransactionClient, year: number): Promise<string> {
    const rows = await tx.$queryRaw<{ lastValue: number }[]>`
        INSERT INTO "ReferenceCounter" ("year", "lastValue")
        VALUES (${year}, 1)
        ON CONFLICT ("year")
        DO UPDATE SET "lastValue" = "ReferenceCounter"."lastValue" + 1
        RETURNING "lastValue"
    `;

    const value = rows[0]?.lastValue ?? 1;

    return `BK-${year}-${String(value).padStart(6, "0")}-${checkSuffix()}`;
}

export function getEvidenceUrl(storedName: string): string {
    const baseUrl = (
        process.env.PUBLIC_API_URL ?? "http://localhost:3000"
    ).replace(/\/+$/, "");

    return `${baseUrl}/uploads/${encodeURIComponent(storedName)}`;
}
