import { afterAll, beforeEach } from "vitest";

import { testDatabaseUrl } from "./env.js";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl();
process.env.PORT ??= "3000";
process.env.JWT_SECRET ??= "test-jwt-secret";
process.env.CSRF_SECRET ??= "test-csrf-secret";
process.env.JWT_EXPIRES_IN ??= "900";
process.env.CORS_ORIGIN ??= "http://localhost:5173";
// Keep the suite offline: the real .env may hold live SMS/email provider keys.
process.env.UNISMS_SECRET_KEY = "";
process.env.BREVO_API_KEY = "";

const { prisma } = await import("../src/db.js");

// Pin the KP deadlines so tests do not depend on whatever the singleton holds.
await prisma.barangaySettings.upsert({
  where: { id: 1 },
  update: {
    deadlineReceived: 1,
    deadlineSummoned: 15,
    deadlineMediation: 15,
    deadlineConciliation: 15,
    riskWindowDays: 3,
    puroks: [
      "Session Road",
      "Assumption Road",
      "Mabini Street",
      "General Luna Road",
      "Fr. Carlu Street",
    ],
    documentOfficeLine: "Office of the Punong Barangay",
  },
  create: { id: 1, deadlineReceived: 1 },
});

const TABLES = [
  '"User"',
  '"RefreshToken"',
  '"Complaint"',
  '"Evidence"',
  '"StatusUpdate"',
  '"ServiceRecord"',
  '"Hearing"',
  '"Notice"',
  '"Notification"',
  '"AuditLog"',
  '"ReferenceCounter"',
  '"LuponMember"',
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
