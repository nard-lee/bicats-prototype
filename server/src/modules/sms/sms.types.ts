export type SmsSendInput = {
  to: string;
  content: string;
  metadata?: Record<string, string>;
};
