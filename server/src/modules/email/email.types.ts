export type EmailMessage = { subject: string; text: string; html: string };

export type EmailSendInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};
