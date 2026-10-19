// Date/time helpers for the DateTimePicker. Kept in a plain module so the
// React Compiler doesn't flag Date usage inside a component file.

export const pad = (n: number) => String(n).padStart(2, "0")

export const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

// Value format used by the picker / <input type="datetime-local">.
export function parseLocal(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function toLocalInput(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

export function formatDisplay(value: Date, now: Date): string {
  const sameDay =
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const isTomorrow =
    value.getFullYear() === tomorrow.getFullYear() &&
    value.getMonth() === tomorrow.getMonth() &&
    value.getDate() === tomorrow.getDate()

  const day = sameDay ? "Today" : isTomorrow ? "Tomorrow" : null
  const date = value.toLocaleDateString(undefined, {
    weekday: day ? undefined : "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const time = value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  return `${day ? `${day}, ` : ""}${date} · ${time}`
}

export function to12(h24: number): { h12: number; meridiem: "AM" | "PM" } {
  const meridiem = h24 < 12 ? "AM" : "PM"
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return { h12, meridiem }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
