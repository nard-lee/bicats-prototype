import { config } from "@/utils/env.config.js";

const SMS_MAX_LENGTH = 670;

export function isSmsEnabled(): boolean {
  return config.unismsSecretKey.trim().length > 0;
}

// UniSMS accepts +639XXXXXXXXX or 09XXXXXXXXX. Stored contacts are digits only.
export function toPhilippineNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("63")) {
    return "0" + digits.slice(2);
  }
  return digits;
}

type SendInput = {
  to: string;
  content: string;
  metadata?: Record<string, string>;
};

const smsService = {
  isSmsEnabled,

  // Fire-and-forget: resolves to true/false, never throws, and never logs secrets.
  async send({ to, content, metadata }: SendInput): Promise<boolean> {
    if (!isSmsEnabled()) return false;

    const recipient = toPhilippineNumber(to);
    if (!recipient) return false;

    const auth = Buffer.from(`${config.unismsSecretKey}:`).toString("base64");

    try {
      const response = await fetch(config.unismsApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          recipient,
          content: content.slice(0, SMS_MAX_LENGTH),
          sender_id: config.unismsSenderId,
          ...(metadata ? { metadata } : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error(`==> sms: send failed (${response.status})`, detail.slice(0, 300));
        return false;
      }

      return true;
    } catch (err) {
      console.error("==> sms: request error", err);
      return false;
    }
  },
};

export default smsService;
