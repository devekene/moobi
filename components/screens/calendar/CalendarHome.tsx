import { useLayoutEffect, useRef, useState, type UIEvent } from "react";
import type { CalendarEvent } from "@/types";
import { calendarDate, monthDays, WEEKDAYS } from "@/lib/calendar";
import { localDateKey } from "@/lib/todos";
import CalendarGrid from "./CalendarGrid";
import styles from "./calendar.module.css";

// Keep a small scrolling window. Adding earlier pages preserves the visible content.
function useCalendarWindow(anchor: number, minimum: number, maximum: number) {
  const [range, setRange] = useState({
    start: Math.max(minimum, anchor - 1),
    end: Math.min(maximum, anchor + 1),
  });
  const scroll = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLElement>(null);
  const previousHeight = useRef<number | null>(null);
  const extending = useRef(false);
  useLayoutEffect(() => {
    const root = scroll.current;
    if (root && target.current)
      root.scrollTop = target.current.offsetTop - root.offsetTop;
  }, []);
  useLayoutEffect(() => {
    if (previousHeight.current !== null && scroll.current) {
      scroll.current.scrollTop +=
        scroll.current.scrollHeight - previousHeight.current;
      previousHeight.current = null;
    }
    extending.current = false;
  }, [range]);
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const root = event.currentTarget;
    if (extending.current) return;
    if (root.scrollTop < 100 && range.start > minimum) {
      extending.current = true;
      previousHeight.current = root.scrollHeight;
      setRange({ ...range, start: range.start - 1 });
    } else if (
      root.scrollHeight - root.scrollTop - root.clientHeight < 300 &&
      range.end < maximum
    ) {
      extending.current = true;
      setRange({ ...range, end: range.end + 1 });
    }
  };
  return { range, scroll, target, onScroll };
}

type Props = {
  selectedDate: string;
  onSelect: (date: string) => void;
};
export function YearOverview({ selectedDate, onSelect }: Props) {
  const selected = calendarDate(selectedDate);
  const year = selected.getFullYear();
  const { range, scroll, target, onScroll } = useCalendarWindow(
    year,
    1900,
    2100,
  );
  const today = new Date();
  return (
    <div
      className={styles.scroll}
      ref={scroll}
      onScroll={onScroll}
      aria-label="Calendar years"
    >
      {Array.from(
        { length: range.end - range.start + 1 },
        (_, index) => range.start + index,
      ).map((value) => (
        <section
          key={value}
          ref={value === year ? target : undefined}
          className={styles.yearSection}
          aria-label={String(value)}
        >
          <h1
            className={styles.yearTitle}
            data-current={value === today.getFullYear()}
          >
            {value}
          </h1>
          <div className={styles.yearGrid}>
            {Array.from({ length: 12 }, (_, month) => (
              <button
                key={month}
                className={styles.miniMonth}
                aria-label={`${new Date(value, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`}
                onClick={() =>
                  onSelect(localDateKey(new Date(value, month, 1)))
                }
              >
                <h2
                  data-current={
                    value === today.getFullYear() && month === today.getMonth()
                  }
                >
                  {new Date(value, month, 1).toLocaleDateString("en", {
                    month: "short",
                  })}
                </h2>
                <span className={styles.miniGrid}>
                  {monthDays(value, month).map((key, i) => (
                    <span
                      key={key ?? i}
                      data-today={key === localDateKey(today)}
                    >
                      {key ? calendarDate(key).getDate() : ""}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
export function MonthOverview({
  selectedDate,
  onSelect,
  events,
  taskDates,
}: Props & { events: CalendarEvent[]; taskDates: ReadonlySet<string> }) {
  const date = calendarDate(selectedDate);
  const anchor = date.getFullYear() * 12 + date.getMonth();
  const { range, scroll, target, onScroll } = useCalendarWindow(
    anchor,
    1900 * 12,
    2100 * 12 + 11,
  );
  return (
    <div
      className={styles.scroll}
      ref={scroll}
      onScroll={onScroll}
      aria-label="Calendar months"
    >
      {Array.from(
        { length: range.end - range.start + 1 },
        (_, index) => range.start + index,
      ).map((value) => {
        const month = new Date(Math.floor(value / 12), value % 12, 1);
        return (
          <section
            key={value}
            ref={value === anchor ? target : undefined}
            className={styles.monthSection}
          >
            <h1>
              {month.toLocaleDateString("en", { month: "long" })}
              {month.getFullYear() !== date.getFullYear() && (
                <small> {month.getFullYear()}</small>
              )}
            </h1>
            <div className={styles.weekdays}>
              {WEEKDAYS.map((day, i) => (
                <span key={i}>{day}</span>
              ))}
            </div>
            <CalendarGrid
              currentDate={month}
              selectedDate={selectedDate}
              setSelectedDate={onSelect}
              taskDates={taskDates}
              getEventsForDate={(key) =>
                events.filter((event) => event.date === key)
              }
            />
          </section>
        );
      })}
    </div>
  );
}
