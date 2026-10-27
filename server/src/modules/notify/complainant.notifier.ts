import { prisma } from "@/db.js";
import auditService from "../audit/audit.service.js";
import emailService from "../email/email.service.js";
import {
  hearingReminderEmail,
  intakeReceivedEmail,
  mediationCancelledEmail,
  mediationScheduledEmail,
  statusUpdateEmail,
} from "../email/email.messages.js";
import type { EmailMessage } from "../email/email.types.js";
import smsService from "../sms/sms.service.js";
import {
  hearingReminderSms,
  intakeReceivedSms,
  mediationCancelledSms,
  mediationScheduledSms,
  statusUpdateSms,
} from "../sms/sms.messages.js";
import settingService from "../setting/setting.service.js";

type Target = {
  id: number;
  reference: string;
  contactNormalized: string;
  complainantEmail: string | null;
  dueAt: Date | null;
};

async function findTarget(complaintId: number): Promise<Target | null> {
  return prisma.complaint.findUnique({
    where: { id: complaintId },
    select: {
      id: true,
      reference: true,
      contactNormalized: true,
      complainantEmail: true,
      dueAt: true,
    },
  });
}

// Fan out to every channel the complainant left us. Each channel is skipped
// when it's not configured or has no address. A channel that was tried and
// refused is written to the audit log: the providers themselves never throw,
// so without this a dead key or a blocked IP is invisible outside the console.
async function dispatch(
  target: Target,
  sms: string,
  email: EmailMessage,
  event: string,
  channels: { sms: boolean; email: boolean },
): Promise<void> {
  const tasks: { channel: "sms" | "email"; run: Promise<boolean> }[] = [];

  if (channels.sms && smsService.isSmsEnabled() && target.contactNormalized) {
    tasks.push({
      channel: "sms",
      run: smsService.send({
        to: target.contactNormalized,
        content: sms,
        metadata: { event, reference: target.reference },
      }),
    });
  }

  if (channels.email && emailService.isEmailEnabled() && target.complainantEmail) {
    tasks.push({
      channel: "email",
      run: emailService.send({
        to: target.complainantEmail,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
  }

  if (tasks.length === 0) return;

  const results = await Promise.allSettled(tasks.map((task) => task.run));
  const failed = tasks.filter((_, index) => {
    const result = results[index] as PromiseSettledResult<boolean>;
    return result.status === "rejected" || result.value === false;
  });
  if (failed.length === 0) return;

  const channelsFailed = failed.map((task) => task.channel).join(" + ");
  await auditService.record({
    action: "complaint.notify.failed",
    entityType: "complaint",
    entityId: target.id,
    summary: `${target.reference}: ${channelsFailed} send failed (${event})`,
    meta: { event, channels: failed.map((task) => task.channel) },
  });
}

const complainantNotifier = {
  // Confirm receipt to the filer, with the reference to track the case by.
  async filingReceived(complaintId: number): Promise<void> {
    if (!smsService.isSmsEnabled() && !emailService.isEmailEnabled()) return;

    const settings = await settingService.get();
    const channels = { sms: settings.notifyIntakeSms, email: settings.notifyIntakeEmail };
    if (!channels.sms && !channels.email) return;

    const target = await findTarget(complaintId);
    if (!target) return;

    const message = { reference: target.reference, dueAt: target.dueAt };
    await dispatch(
      target,
      intakeReceivedSms(message),
      intakeReceivedEmail(message),
      "filing_received",
      channels,
    );
  },

  // Notify the complainant that their case moved to a new KP step.
  async statusUpdate(
    complaintId: number,
    input: { status: string; publicNote?: string | null; hearingAt?: Date | null },
  ): Promise<void> {
    if (!smsService.isSmsEnabled() && !emailService.isEmailEnabled()) return;

    const settings = await settingService.get();
    const channels = { sms: settings.notifyStatusSms, email: settings.notifyStatusEmail };
    if (!channels.sms && !channels.email) return;

    const target = await findTarget(complaintId);
    if (!target) return;

    const message = { reference: target.reference, ...input };
    await dispatch(
      target,
      statusUpdateSms(message),
      statusUpdateEmail(message),
      "status_update",
      channels,
    );
  },

  // Notify the complainant that a mediation session was scheduled or moved.
  async mediationScheduled(
    complaintId: number,
    input: { kind: string; scheduledAt: Date; location?: string | null; rescheduled?: boolean },
  ): Promise<void> {
    if (!smsService.isSmsEnabled() && !emailService.isEmailEnabled()) return;

    const settings = await settingService.get();
    const channels = {
      sms: settings.notifyMediationSms,
      email: settings.notifyMediationEmail,
    };
    if (!channels.sms && !channels.email) return;

    const target = await findTarget(complaintId);
    if (!target) return;

    const message = { reference: target.reference, ...input };
    await dispatch(
      target,
      mediationScheduledSms(message),
      mediationScheduledEmail(message),
      "mediation_scheduled",
      channels,
    );
  },

  // Notify the complainant that a mediation session was cancelled.
  async mediationCancelled(
    complaintId: number,
    input: { kind: string },
  ): Promise<void> {
    if (!smsService.isSmsEnabled() && !emailService.isEmailEnabled()) return;

    const settings = await settingService.get();
    const channels = {
      sms: settings.notifyCancelledSms,
      email: settings.notifyCancelledEmail,
    };
    if (!channels.sms && !channels.email) return;

    const target = await findTarget(complaintId);
    if (!target) return;

    const message = { reference: target.reference, ...input };
    await dispatch(
      target,
      mediationCancelledSms(message),
      mediationCancelledEmail(message),
      "mediation_cancelled",
      channels,
    );
  },

  // Daily reminder that a scheduled session happens within 24 hours.
  async hearingReminder(
    complaintId: number,
    input: { kind: string; scheduledAt: Date; location?: string | null },
  ): Promise<void> {
    if (!smsService.isSmsEnabled() && !emailService.isEmailEnabled()) return;

    const settings = await settingService.get();
    const channels = {
      sms: settings.notifyMediationSms,
      email: settings.notifyMediationEmail,
    };
    if (!channels.sms && !channels.email) return;

    const target = await findTarget(complaintId);
    if (!target) return;

    const message = { reference: target.reference, ...input };
    await dispatch(
      target,
      hearingReminderSms(message),
      hearingReminderEmail(message),
      "hearing_reminder",
      channels,
    );
  },
};

export default complainantNotifier;
