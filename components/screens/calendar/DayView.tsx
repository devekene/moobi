import { useLayoutEffect, useRef } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { calendarDate, shiftDate, weekDays, WEEKDAYS } from "@/lib/calendar";
import { localDateKey } from "@/lib/todos";
import type { CalendarEvent } from "@/types";
import CalendarTasks from "./CalendarTasks";
import EventList from "./EventList";
import styles from "./calendar.module.css";

type Props = {
  date: string;
  now: Date;
  events: CalendarEvent[];
  showTasks: boolean;
  list: boolean;
  onDate: (date: string) => void;
  onEvent: (event: CalendarEvent) => void;
  onAdd: (time: string) => void;
};
export default function DayView({
  date,
  now,
  events,
  showTasks,
  list,
  onDate,
  onEvent,
  onAdd,
}: Props) {
  const scroll = useRef<HTMLDivElement>(null);
  const focusHour = useRef<HTMLDivElement>(null);
  const today = localDateKey(now);
  const startHour = date === today ? Math.max(0, now.getHours() - 1) : 8;
  useLayoutEffect(() => {
    if (scroll.current && focusHour.current)
      scroll.current.scrollTop =
        focusHour.current.offsetTop - scroll.current.offsetTop;
  }, [date, list]);
  return (
    <>
      <div className={styles.weekStrip}>
        <button
          className={styles.weekArrow}
          aria-label="Previous week"
          onClick={() => onDate(shiftDate(date, -7))}
        >
          <LuChevronLeft />
        </button>
        <div className={styles.weekDates}>
          {weekDays(date).map((key, i) => (
            <button
              key={key}
              aria-label={key}
              aria-pressed={key === date}
              aria-current={key === today ? "date" : undefined}
              onClick={() => onDate(key)}
              data-weekend={i > 4}
            >
              <small>{WEEKDAYS[i]}</small>
              <span
                className={styles.dayNumber}
                data-today={key === today}
                data-selected={key === date}
              >
                {calendarDate(key).getDate()}
              </span>
            </button>
          ))}
        </div>
        <button
          className={styles.weekArrow}
          aria-label="Next week"
          onClick={() => onDate(shiftDate(date, 7))}
        >
          <LuChevronRight />
        </button>
      </div>
      <h1 className={styles.dayHeading}>
        {calendarDate(date).toLocaleDateString("en-GB", { weekday: "long" })} –{" "}
        {calendarDate(date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </h1>
      <div
        className={styles.scroll}
        ref={scroll}
        aria-label={list ? "Day agenda" : "Day timeline"}
      >
        {list ? (
          <div className={styles.agenda}>
            <EventList events={events} onSelect={onEvent} />
            {!events.length && <p className={styles.empty}>No events</p>}
            {showTasks && <CalendarTasks date={date} />}
          </div>
        ) : (
          <>
            {(events.some((event) => !event.time) || showTasks) && (
              <div className={styles.allDay}>
                <EventList
                  events={events.filter((event) => !event.time)}
                  onSelect={onEvent}
                />
                {showTasks && <CalendarTasks date={date} />}
              </div>
            )}
            <div className={styles.timeline}>
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className={styles.hour}
                  ref={hour === startHour ? focusHour : undefined}
                >
                  <button
                    className={styles.hourLabel}
                    aria-label={`Add event at ${String(hour).padStart(2, "0")}:00`}
                    onClick={() => onAdd(`${String(hour).padStart(2, "0")}:00`)}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </button>
                  <div className={styles.hourContent}>
                    {events
                      .filter(
                        (event) =>
                          event.time && Number(event.time.slice(0, 2)) === hour,
                      )
                      .map((event) => (
                        <button
                          key={event.id}
                          className={styles.timelineEvent}
                          data-category={event.category}
                          onClick={() => onEvent(event)}
                        >
                          <span>{event.title}</span>
                          <small>{event.time}</small>
                        </button>
                      ))}
                  </div>
                  {date === today && hour === now.getHours() && (
                    <div
                      className={styles.nowLine}
                      style={{ top: `${(now.getMinutes() / 60) * 100}%` }}
                    >
                      <span>
                        {now.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
