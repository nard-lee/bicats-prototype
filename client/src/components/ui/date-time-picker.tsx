"use client"

import * as React from "react"
import { cn } from "cn"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MONTHS,
  WEEKDAYS,
  daysInMonth,
  formatDisplay,
  pad,
  parseLocal,
  to12,
  toLocalInput,
} from "@/lib/datetime"

// Module-scope "now" so we don't call an impure Date during render.
const NOW = new Date()

type Props = {
  id?: string
  value?: string | null
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  minuteStep?: number
  className?: string
  "aria-invalid"?: boolean
}

export default function DateTimePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Select date & time",
  minuteStep = 5,
  className,
  ...rest
}: Props) {
  const selected = parseLocal(value)
  const [open, setOpen] = React.useState(false)
  const initial = selected ?? NOW
  const [view, setView] = React.useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  })

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes: number[] = []
  for (let m = 0; m < 60; m += minuteStep) minutes.push(m)
  const currentMinute = selected ? selected.getMinutes() : 0
  if (!minutes.includes(currentMinute)) {
    minutes.push(currentMinute)
    minutes.sort((a, b) => a - b)
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      const base = parseLocal(value) ?? NOW
      setView({ year: base.getFullYear(), month: base.getMonth() })
    }
    setOpen(next)
  }

  function emit(next: Date) {
    onChange(toLocalInput(next))
  }

  function pickDay(day: number) {
    const base = parseLocal(value) ?? NOW
    emit(new Date(view.year, view.month, day, base.getHours(), base.getMinutes()))
  }

  function setHour(h12: number, meridiem: "AM" | "PM") {
    const base = parseLocal(value) ?? NOW
    let h24: number
    if (meridiem === "AM") h24 = h12 === 12 ? 0 : h12
    else h24 = h12 === 12 ? 12 : h12 + 12
    emit(new Date(base.getFullYear(), base.getMonth(), base.getDate(), h24, base.getMinutes()))
  }

  function setMinute(minute: number) {
    const base = parseLocal(value) ?? NOW
    emit(new Date(base.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), minute))
  }

  function setMeridiem(meridiem: "AM" | "PM") {
    if (!selected) return
    const { h12 } = to12(selected.getHours())
    setHour(h12, meridiem)
  }

  function goToToday() {
    setView({ year: NOW.getFullYear(), month: NOW.getMonth() })
    emit(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), selected?.getHours() ?? 9, selected?.getMinutes() ?? 0))
  }

  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const totalDays = daysInMonth(view.year, view.month)
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const { h12, meridiem } = selected ? to12(selected.getHours()) : { h12: 12, meridiem: "AM" as const }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          data-empty={!selected}
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-transparent px-2.5 py-1 text-left text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-empty:text-muted-foreground dark:bg-input/30",
            className,
          )}
          {...rest}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">
            {selected ? formatDisplay(selected, NOW) : placeholder}
          </span>
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange("")
              }}
            >
              <XIcon className="size-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-3" align="start">
        <div className="flex items-center justify-between pb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() =>
              setView((v) =>
                v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 },
              )
            }
          >
            <ChevronLeftIcon />
          </Button>
          <div className="text-sm font-medium">
            {MONTHS[view.month]} {view.year}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={() =>
              setView((v) =>
                v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 },
              )
            }
          >
            <ChevronRightIcon />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 pb-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />
            const isSelected =
              selected &&
              selected.getFullYear() === view.year &&
              selected.getMonth() === view.month &&
              selected.getDate() === day
            const isToday =
              NOW.getFullYear() === view.year &&
              NOW.getMonth() === view.month &&
              NOW.getDate() === day
            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => pickDay(day)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-muted",
                  isToday && !isSelected && "font-semibold text-primary",
                  isSelected &&
                    "bg-primary font-medium text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                {day}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
          <Select value={String(h12)} onValueChange={(v) => setHour(Number(v), meridiem)}>
            <SelectTrigger size="sm" className="flex-1" aria-label="Hour">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {pad(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select value={String(selected ? selected.getMinutes() : 0)} onValueChange={(v) => setMinute(Number(v))}>
            <SelectTrigger size="sm" className="flex-1" aria-label="Minute">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {pad(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex overflow-hidden rounded-md border">
            {(["AM", "PM"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeridiem(m)}
                className={cn(
                  "h-8 px-2 text-xs font-medium transition-colors",
                  meridiem === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
