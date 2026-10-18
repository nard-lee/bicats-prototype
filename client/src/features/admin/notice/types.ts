export type NoticeActionResult = {
  success?: boolean;
  intent?: "update" | "delete";
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};
