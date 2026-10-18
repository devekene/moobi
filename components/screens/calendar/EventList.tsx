import type { CalendarEvent } from "@/types";
import { calendarDate } from "@/lib/calendar";
import styles from "./calendar.module.css";
export default function EventList({
  events,
  onSelect,
  showDate = false,
}: {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  showDate?: boolean;
}) {
  return (
    <div className={styles.eventList}>
      {events.map((event) => (
        <button
          key={event.id}
          className={styles.eventRow}
          onClick={() => onSelect(event)}
        >
          <span className={styles.eventTime}>
            {showDate
              ? calendarDate(event.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })
              : (event.time ?? "all-day")}
          </span>
          <span className={styles.eventSummary} data-category={event.category}>
            <strong>{event.title}</strong>
            {showDate && <small>{event.time ?? "All day"}</small>}
            {event.description && <small>{event.description}</small>}
          </span>
        </button>
      ))}
    </div>
  );
}
