import { config } from "@/utils/env.config.js";

export type MsgLang = "en" | "tl";

// Sessions and deadlines are Manila events. The host clock is not: Render runs
// its containers in UTC, so without an explicit zone every message a resident
// reads is eight hours out ("mediation set on 1:00 AM").
const MANILA = "Asia/Manila";

// Tagalog messages render their dates in Filipino, matching the client's rule
// of fil-PH whenever the UI language is tl.
function localeOf(lang: MsgLang): string {
  return lang === "tl" ? "fil-PH" : "en-PH";
}

// SMS and email dates differ on purpose: texts stay compact to save characters,
// emails spell out the weekday.
export function formatShortWhen(date: Date, lang: MsgLang): string {
  return date.toLocaleString(localeOf(lang), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: MANILA,
  });
}

export function formatLongWhen(date: Date, lang: MsgLang): string {
  return date.toLocaleString(localeOf(lang), {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: MANILA,
  });
}

// CORS_ORIGIN is the front-end origin in every environment (Vite in dev, the
// deployed app in production), so it doubles as the base for resident links.
export function trackingUrl(reference: string): string {
  return `${config.corsOrigin}/track-complaint?ref=${encodeURIComponent(reference)}`;
}
