import { config } from "@/utils/env.config.js";

export function isEmailEnabled(): boolean {
  return (
    config.brevoApiKey.trim().length > 0 &&
    config.brevoSenderEmail.trim().length > 0
  );
}

type SendInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const emailService = {
  isEmailEnabled,

  // Fire-and-forget: resolves to true/false, never throws, and never logs secrets.
  async send({ to, subject, text, html }: SendInput): Promise<boolean> {
    if (!isEmailEnabled()) return false;

    try {
      const response = await fetch(config.brevoApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "api-key": config.brevoApiKey,
        },
        body: JSON.stringify({
          sender: {
            name: config.brevoSenderName,
            email: config.brevoSenderEmail,
          },
          to: [{ email: to }],
          subject,
          textContent: text,
          ...(html ? { htmlContent: html } : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error(`==> email: send failed (${response.status})`, detail.slice(0, 300));
        return false;
      }

      return true;
    } catch (err) {
      console.error("==> email: request error", err);
      return false;
    }
  },
};

export default emailService;
