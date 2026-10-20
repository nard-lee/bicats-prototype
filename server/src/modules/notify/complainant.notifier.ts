import { prisma } from "@/db.js";
import emailService from "../email/email.service.js";
import {
  mediationCancelledEmail,
  mediationScheduledEmail,
  statusUpdateEmail,
} from "../email/email.messages.js";
import smsService from "../sms/sms.service.js";
import {
  mediationCancelledSms,
  mediationScheduledSms,
  statusUpdateSms,
} from "../sms/sms.messages.js";
import settingService from "../setting/setting.service.js";

type Target = {
  reference: string;
  contactNormalized: string;
  complainantEmail: string | null;
};

async function findTarget(complaintId: number): Promise<Target | null> {
  return prisma.complaint.findUnique({
    where: { id: complaintId },
    select: { reference: true, contactNormalized: true, complainantEmail: true },
  });
}

// Fan out to every channel the complainant left us. Each channel is skipped
// when it's not configured or has no address, and failures are isolated.
async function dispatch(
  target: Target,
  sms: string,
  email: { subject: string; text: string; html: string },
  event: string,
  channels: { sms: boolean; email: boolean },
): Promise<void> {
  const tasks: Promise<boolean>[] = [];

  if (channels.sms && smsService.isSmsEnabled() && target.contactNormalized) {
    tasks.push(
      smsService.send({
        to: target.contactNormalized,
        content: sms,
        metadata: { event, reference: target.reference },
      }),
    );
  }

  if (channels.email && emailService.isEmailEnabled() && target.complainantEmail) {
    tasks.push(
      emailService.send({
        to: target.complainantEmail,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}

const complainantNotifier = {
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
};

export default complainantNotifier;
