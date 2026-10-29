import { describe, expect, it } from "vitest";

import {
  intakeReceivedSms,
  mediationScheduledSms,
} from "../src/modules/sms/sms.messages.js";
import { statusUpdateEmail } from "../src/modules/email/email.messages.js";
import { formatShortWhen } from "../src/modules/notify/format.js";

// 01:00 UTC is 09:00 in Manila. Render's containers run on UTC, so a formatter
// that forgets its time zone hands the resident a 1 AM session.
const morning = new Date("2026-11-02T01:00:00Z");

describe("outbound message wording", () => {
  it("reads session times as Manila whatever the host clock is", () => {
    expect(formatShortWhen(morning, "en")).toContain("9:00 AM");
    expect(formatShortWhen(morning, "tl")).toContain("9:00 AM");
  });

  it("answers in the language the case was filed in", () => {
    const tl = intakeReceivedSms({ reference: "26-10-0001", dueAt: morning, lang: "tl" });
    expect(tl).toContain("Ang inyong reklaming 26-10-0001");
    expect(tl).toContain("Nob 2, 2026");

    const en = intakeReceivedSms({ reference: "26-10-0001", dueAt: morning, lang: "en" });
    expect(en).toContain("Your complaint 26-10-0001");
    expect(en).toContain("Nov 2, 2026");
  });

  it("links the case rather than naming an internal system", () => {
    const body = mediationScheduledSms({
      reference: "26-10-0001",
      kind: "mediation",
      scheduledAt: morning,
      lang: "en",
    });

    expect(body).toContain("/track-complaint?ref=26-10-0001");
    expect(body).not.toMatch(/^(BARANGAY|BICATS)/);
    expect(body).not.toContain("BICATS");
  });

  it("escapes a staff note in the HTML but keeps it verbatim in the text", () => {
    const note = "Bring your ID & documents <2pm>";
    const mail = statusUpdateEmail({
      reference: "26-10-0001",
      status: "mediation",
      publicNote: note,
      lang: "en",
    });

    expect(mail.text).toContain(note);
    expect(mail.html).toContain("ID &amp; documents &lt;2pm&gt;");
    expect(mail.html).not.toContain(note);
  });
});
