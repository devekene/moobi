import { useState } from "react";
import type { CalendarEvent } from "@/types";
import { CATEGORIES, type EventDraft } from "@/lib/calendar";
import styles from "./calendar.module.css";
export default function EventForm({
  event,
  date,
  time,
  onSave,
  onCancel,
}: {
  event?: CalendarEvent;
  date: string;
  time?: string;
  onSave: (draft: EventDraft) => void;
  onCancel: () => void;
}) {
  const [allDay, setAllDay] = useState(!event?.time && !time);
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const category =
          CATEGORIES.find((item) => item === data.get("category")) ?? "event";
        const title = String(data.get("title") ?? "").trim();
        if (!title) return;
        onSave({
          title,
          date: String(data.get("date")),
          time: allDay ? undefined : String(data.get("time")),
          category,
          description: String(data.get("description") ?? ""),
        });
      }}
    >
      <label>
        Title
        <input
          name="title"
          placeholder="Event title"
          defaultValue={event?.title}
          required
          maxLength={200}
          autoFocus
        />
      </label>
      <label>
        Date
        <input
          name="date"
          type="date"
          defaultValue={event?.date ?? date}
          required
          min="1900-01-01"
          max="2100-12-31"
        />
      </label>
      <label className={styles.switchRow}>
        All-day
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
      </label>
      {!allDay && (
        <label>
          Time
          <input
            name="time"
            type="time"
            defaultValue={event?.time ?? time ?? "09:00"}
            required
          />
        </label>
      )}
      <label>
        Calendar
        <select name="category" defaultValue={event?.category ?? "event"}>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notes
        <textarea
          name="description"
          placeholder="Add notes"
          defaultValue={event?.description}
          rows={3}
          maxLength={4000}
        />
      </label>
      <div className={styles.formActions}>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className={styles.primary} type="submit">
          {event ? "Save changes" : "Add event"}
        </button>
      </div>
    </form>
  );
}
