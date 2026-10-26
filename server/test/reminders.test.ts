import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import { runReminderScan } from "../src/jobs/reminder.job.js";
import { createUser, csrfToken, submitComplaint } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function filedComplaintId(): Promise<number> {
  const agent = request.agent(app);
  const token = await csrfToken(agent);
  const filed = await submitComplaint(agent, token).expect(200);

  const complaint = await prisma.complaint.findUnique({
    where: { reference: filed.body.reference as string },
    select: { id: true },
  });

  return complaint!.id;
}

describe("deadline reminders", () => {
  it("alerts staff once a day about an overdue case and leaves the case alone", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();

    await prisma.complaint.update({
      where: { id: complaintId },
      data: { dueAt: new Date(Date.now() - DAY_MS) },
    });
    const before = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { status: true, dueAt: true },
    });

    expect(await runReminderScan()).toBe(1);

    const alerts = await prisma.notification.findMany({
      where: { complaintId, type: "overdue" },
    });
    expect(alerts).toHaveLength(1);

    await runReminderScan();
    expect(
      await prisma.notification.count({
        where: { complaintId, type: "overdue" },
      }),
    ).toBe(1);

    const after = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { status: true, dueAt: true },
    });
    expect(after).toEqual(before);
  });
});
