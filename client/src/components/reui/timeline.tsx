import type { HTMLAttributes, TimeHTMLAttributes } from "react"
import { createContext, useCallback, useContext, useState } from "react"
import { Slot } from "radix-ui"

import { cn } from "cn"

// Dot size, where the dot sits against the first line of text, the row rhythm
// and the date column width all come from these variables, which the list
// declares once. The rail is placed from the same variables that build the
// grid columns, so it stays centred under the dot at either breakpoint, and it
// runs from one dot centre to the next while the opaque dot covers its end.
type TimelineContextValue = {
  activeStep: number
  setActiveStep: (step: number) => void
  // A narrow timeline has no room for a 12rem date column, so it keeps the
  // phone layout at every width: the date reads above the title.
  stacked: boolean
}

const TimelineContext = createContext<TimelineContextValue | undefined>(
  undefined,
)

const useTimeline = () => {
  const context = useContext(TimelineContext)
  if (!context) {
    throw new Error("useTimeline must be used within a Timeline")
  }
  return context
}

interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  defaultValue?: number
  value?: number
  onValueChange?: (value: number) => void
  stacked?: boolean
}

function Timeline({
  className,
  children,
  defaultValue = 1,
  onValueChange,
  value,
  stacked = false,
  ...props
}: TimelineProps) {
  const [activeStep, setInternalStep] = useState(defaultValue)

  const setActiveStep = useCallback(
    (step: number) => {
      if (value === undefined) {
        setInternalStep(step)
      }
      onValueChange?.(step)
    },
    [onValueChange, value],
  )

  const currentStep = value ?? activeStep

  return (
    <TimelineContext.Provider
      value={{ activeStep: currentStep, setActiveStep, stacked }}
    >
      <ol
        className={cn(
          "flex flex-col [--timeline-dot-offset:0.625rem] [--timeline-dot-size:0.75rem] [--timeline-gap:1.75rem] [--timeline-time-width:12rem]",
          className,
        )}
        data-slot="timeline"
        {...props}
      >
        {children}
      </ol>
    </TimelineContext.Provider>
  )
}

interface TimelineItemProps extends HTMLAttributes<HTMLLIElement> {
  step: number
}

function TimelineItem({ className, step, ...props }: TimelineItemProps) {
  const { activeStep, stacked } = useTimeline()
  const current = step === activeStep

  return (
    <li
      className={cn(
        "group/timeline-item relative grid grid-cols-[var(--timeline-dot-size)_1fr] gap-x-(--timeline-col-gap) gap-y-1.5 pb-(--timeline-gap) last:pb-0 [--timeline-col-gap:--spacing(4)] [--timeline-rail-x:calc(var(--timeline-dot-size)/2)] sm:grid-cols-[var(--timeline-time-width)_var(--timeline-dot-size)_1fr] sm:[--timeline-col-gap:--spacing(6)] sm:[--timeline-rail-x:calc(var(--timeline-time-width)+var(--timeline-col-gap)+var(--timeline-dot-size)/2)]",
        stacked &&
          "sm:grid-cols-[var(--timeline-dot-size)_1fr] sm:[--timeline-rail-x:calc(var(--timeline-dot-size)/2)]",
        current
          ? "[--timeline-ink:var(--status-ink)]"
          : "[--timeline-ink:var(--muted-foreground)]",
        className,
      )}
      data-current={current || undefined}
      data-slot="timeline-item"
      data-step={step}
      {...props}
    />
  )
}

// TimelineDate
// TimeHTMLAttributes (not the generic HTMLAttributes) so the <time>-specific
// `dateTime` attribute is accepted.
interface TimelineDateProps extends TimeHTMLAttributes<HTMLTimeElement> {
  asChild?: boolean
}

function TimelineDate({
  asChild = false,
  className,
  ...props
}: TimelineDateProps) {
  const { stacked } = useTimeline()
  const Comp = asChild ? Slot.Root : "time"

  return (
    <Comp
      className={cn(
        "col-start-2 row-start-1 text-sm leading-5 tabular-nums text-muted-foreground sm:col-start-1",
        stacked && "sm:col-start-2",
        className,
      )}
      data-slot="timeline-date"
      {...props}
    />
  )
}

function TimelineTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  const { stacked } = useTimeline()

  return (
    <h3
      className={cn(
        "col-start-2 row-start-2 font-heading text-sm leading-5 font-bold tracking-tight text-foreground sm:col-start-3 sm:row-start-1 group-data-[current=true]/timeline-item:text-primary dark:group-data-[current=true]/timeline-item:text-status-ink",
        stacked && "sm:col-start-2 sm:row-start-2",
        className,
      )}
      data-slot="timeline-title"
      {...props}
    />
  )
}

function TimelineContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { stacked } = useTimeline()

  return (
    <div
      className={cn(
        "col-start-2 row-start-3 min-w-0 text-sm sm:col-start-3 sm:row-start-2",
        stacked && "sm:col-start-2 sm:row-start-3",
        className,
      )}
      data-slot="timeline-content"
      {...props}
    />
  )
}

interface TimelineIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

function TimelineIndicator({
  asChild = false,
  className,
  children,
  ...props
}: TimelineIndicatorProps) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      aria-hidden="true"
      className={cn(
        "absolute left-(--timeline-rail-x) top-[calc(var(--timeline-dot-offset)-var(--timeline-dot-size)/2)] z-10 size-(--timeline-dot-size) -translate-x-1/2 rounded-full bg-(--timeline-ink)",
        className,
      )}
      data-slot="timeline-indicator"
      {...props}
    >
      {children}
    </Comp>
  )
}

function TimelineSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute top-(--timeline-dot-offset) bottom-[calc(var(--timeline-dot-offset)*-1)] left-(--timeline-rail-x) w-px -translate-x-1/2 bg-(--timeline-ink) group-last/timeline-item:hidden",
        className,
      )}
      data-slot="timeline-separator"
      {...props}
    />
  )
}

export {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
}
