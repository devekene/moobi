import { useState } from "react";
import type { CalendarEvent } from "@/types";
import { calendarDate } from "@/lib/calendar";
import styles from "./calendar.module.css";
export default function EventDetails({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={styles.details}>
      <p>
        {calendarDate(event.date).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <p>{event.time ?? "All day"}</p>
      <dl>
        <dt>Calendar</dt>
        <dd>{event.category}</dd>
        {event.description && (
          <>
            <dt>Notes</dt>
            <dd>{event.description}</dd>
          </>
        )}
      </dl>
      {event.isGlobal ? (
        <p className={styles.empty}>Included holiday · read only</p>
      ) : (
        <div className={styles.formActions}>
          <button onClick={onEdit}>Edit event</button>
          <button
            className={styles.destructive}
            onClick={() => (confirm ? onDelete() : setConfirm(true))}
          >
            {confirm ? "Confirm delete" : "Delete event"}
          </button>
          {confirm && (
            <button onClick={() => setConfirm(false)}>Keep event</button>
          )}
        </div>
      )}
    </div>
  );
}
