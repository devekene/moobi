"use client";

import { cn } from "@/lib/utils";

type CalendarEvent = {
  title: string;
  time?: string;
  location?: string;
};

type CalendarWidgetProps = {
  date?: Date;
  event?: CalendarEvent | null;
  onOpen?: () => void;
  className?: string;
};

export default function CalendarWidget({
  date = new Date(),
  event = { title: "No upcoming events" },
  onOpen,
  className,
}: CalendarWidgetProps) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const day = date.getDate();

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={`Open Calendar. ${weekday}, ${day}`}
      className={cn(
        "group relative isolate block aspect-square w-full overflow-hidden rounded-[22%]",
        "border border-[var(--phone-border)] bg-[var(--phone-surface-elevated)]/75",
        "backdrop-blur-[16px] backdrop-saturate-[1.45]",
        "shadow-[0_7px_18px_rgba(0,0,0,0.18),inset_0_1px_0_color-mix(in_srgb,var(--phone-text)_18%,transparent)]",
        "text-left text-[var(--phone-text)] transition-[transform,filter] duration-150",
        "focus-visible:ring-2 focus-visible:ring-[var(--phone-focus)] focus-visible:outline-none enabled:active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--phone-accent)_24%,transparent)_0%,color-mix(in_srgb,var(--phone-accent)_10%,transparent)_42%,color-mix(in_srgb,var(--phone-canvas)_22%,transparent)_100%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[25%] -left-[20%] h-[75%] w-[95%] rounded-full bg-[var(--phone-text)]/13 blur-[22px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[5%] -right-[15%] h-[60%] w-[65%] rounded-full bg-[var(--phone-accent)]/13 blur-[18px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent to-[var(--phone-canvas)]/17"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-[12%] left-[12%] h-px bg-gradient-to-r from-transparent via-[var(--phone-text)]/30 to-transparent"
      />

      <span className="absolute inset-x-[11%] top-[9%] bottom-[10%] z-10 flex min-w-0 flex-col justify-between">
        <span className="flex min-w-0 flex-col gap-px">
          <span className="block truncate text-[8px] leading-[10px] font-semibold tracking-[-0.12px] text-[var(--phone-text-secondary)]">
            {weekday}
          </span>
          <span className="block text-[27px] leading-[28px] font-semibold tracking-[-1.1px] [text-shadow:0_1px_2px_rgba(0,0,0,0.12)]">
            {day}
          </span>
        </span>
        <span className="flex min-h-0 min-w-0 gap-[6px]">
          <span
            aria-hidden="true"
            className="w-px shrink-0 self-stretch bg-[repeating-linear-gradient(to_bottom,var(--phone-text-secondary)_0px,var(--phone-text-secondary)_2px,transparent_2px,transparent_4px)]"
          />
          <span className="flex min-w-0 flex-col">
            {event?.time && (
              <span className="truncate text-[7px] leading-[9px] font-medium text-[var(--phone-text-secondary)]">
                {event.time}
              </span>
            )}
            <span className="line-clamp-2 text-[8px] leading-[9px] font-semibold tracking-[-0.1px]">
              {event?.title ?? "No upcoming events"}
            </span>
            {event?.location && (
              <span className="mt-px truncate text-[7px] leading-[8px] text-[var(--phone-text-muted)]">
                {event.location}
              </span>
            )}
          </span>
        </span>
      </span>
    </button>
  );
}
