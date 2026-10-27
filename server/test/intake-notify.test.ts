import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import emailService from "../src/modules/email/email.service.js";
import complainantNotifier from "../src/modules/notify/complainant.notifier.js";
import { csrfToken, submitComplaint } from "./helpers.js";

const EMAIL = "filer@bicats.test";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("intake receipt", () => {
  it("hands the filer a receipt as soon as intake accepts the complaint", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);
    const receipt = vi
      .spyOn(complainantNotifier, "filingReceived")
      .mockResolvedValue(undefined);

    const filed = await submitComplaint(agent, token, {
      complainantEmail: EMAIL,
    }).expect(200);

    const complaint = await prisma.complaint.findUniqueOrThrow({
      where: { reference: filed.body.reference as string },
      select: { id: true },
    });

    expect(receipt).toHaveBeenCalledWith(complaint.id);
  });

  it("leaves an audit trail when the provider refuses the send", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);
    await submitComplaint(agent, token, { complainantEmail: EMAIL }).expect(200);

    const complaint = await prisma.complaint.findFirstOrThrow({
      where: { complainantEmail: EMAIL },
      select: { id: true, reference: true },
    });

    // A configured provider that answers "no" is exactly what a bad key or a
    // blocked IP looks like from the notifier's side.
    vi.spyOn(emailService, "isEmailEnabled").mockReturnValue(true);
    vi.spyOn(emailService, "send").mockResolvedValue(false);

    await complainantNotifier.filingReceived(complaint.id);

    const entry = await prisma.auditLog.findFirst({
      where: { action: "complaint.notify.failed", entityId: complaint.id },
    });

    expect(entry?.summary).toBe(
      `${complaint.reference}: email send failed (filing_received)`,
    );
  });
});
