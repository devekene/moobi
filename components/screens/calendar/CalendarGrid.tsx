import type { CalendarEvent } from "@/types";
import { localDateKey } from "@/lib/todos";
import { calendarDate, monthDays } from "@/lib/calendar";
import styles from "./calendar.module.css";

type Props = {
  currentDate: Date;
  taskDates?: ReadonlySet<string>;
  getEventsForDate: (date: string) => CalendarEvent[];
  selectedDate: string | null;
  setSelectedDate: (date: string) => void;
};
export default function CalendarGrid({
  currentDate,
  taskDates,
  getEventsForDate,
  selectedDate,
  setSelectedDate,
}: Props) {
  const today = localDateKey();
  return (
    <div className={styles.monthGrid}>
      {monthDays(currentDate.getFullYear(), currentDate.getMonth()).map(
        (key, index) => {
          if (!key)
            return (
              <div
                key={`blank-${index}`}
                className={styles.monthCell}
                aria-hidden="true"
              />
            );
          const events = getEventsForDate(key);
          const hasTasks = taskDates?.has(key);
          return (
            <button
              key={key}
              className={styles.monthCell}
              data-weekend={index % 7 > 4}
              aria-label={`${key}${hasTasks ? ", scheduled todos" : ""}${events.length ? `, ${events.length} events` : ""}`}
              aria-current={key === today ? "date" : undefined}
              aria-pressed={key === selectedDate}
              onClick={() => setSelectedDate(key)}
            >
              <span className={styles.dayNumber} data-today={key === today}>
                {calendarDate(key).getDate()}
              </span>
              <span className={styles.cellEvents}>
                {events.slice(0, 2).map((event) => (
                  <span
                    key={event.id}
                    className={styles.eventChip}
                    data-category={event.category}
                  >
                    {event.title}
                  </span>
                ))}
                {hasTasks && <span className={styles.todoChip}>Todos</span>}
                {events.length > 2 && (
                  <span className={styles.moreEvents}>
                    +{events.length - 2} more
                  </span>
                )}
              </span>
            </button>
          );
        },
      )}
    </div>
  );
}
