"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LuCalendarDays,
  LuChevronLeft,
  LuInbox,
  LuList,
  LuPlus,
  LuRows2,
  LuSearch,
  LuX,
} from "react-icons/lu";
import type { CalendarEvent } from "@/types";
import { globalEvents } from "@/constants";
import { calendarDate, eventsOnDate } from "@/lib/calendar";
import { localDateKey, scheduledTasks } from "@/lib/todos";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useNotesStore } from "@/stores/useNotesStore";
import { YearOverview, MonthOverview } from "./CalendarHome";
import DayView from "./DayView";
import EventForm from "./EventForm";
import EventDetails from "./EventDetails";
import EventList from "./EventList";
import { scrollCalendarSheet } from "./scrollSheet";
import styles from "./calendar.module.css";

type Sheet =
  | { type: "form"; event?: CalendarEvent; time?: string }
  | { type: "event"; event: CalendarEvent }
  | { type: "search" | "calendars" | "inbox" };
export default function CalendarApp() {
  const { events, selectedDate, view, navigate, saveEvent, deleteEvent } =
    useCalendarStore();
  const notes = useNotesStore((state) => state.notes);
  const [now, setNow] = useState(() => new Date());
  const returnFocus = useRef<HTMLElement | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const openSheet = (next: Sheet) => {
    if (!sheet && document.activeElement instanceof HTMLElement)
      returnFocus.current = document.activeElement;
    setSheet(next);
  };
  const attachSheetScroll = useCallback((body: HTMLDivElement | null) => {
    if (!body) return;
    // Chromium can deliver wheel events without scrolling this modal inside
    // the CSS 3D display. Own the wheel gesture here, once, for every sheet.
    const scroll = (event: WheelEvent) => {
      const textarea =
        event.target instanceof Element
          ? event.target.closest("textarea")
          : null;
      if (scrollCalendarSheet(body, event, textarea)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    body.addEventListener("wheel", scroll, { passive: false });
    return () => body.removeEventListener("wheel", scroll);
  }, []);
  const [query, setQuery] = useState("");
  const [list, setList] = useState(false);
  const [sources, setSources] = useState({
    events: true,
    holidays: true,
    todos: true,
  });
  const [scrollKey, setScrollKey] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (!document.hidden) {
        setNow(new Date());
        timer = setInterval(() => setNow(new Date()), 60_000);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  const date = calendarDate(selectedDate);
  const visibleEvents = [
    ...(sources.events ? events : []),
    ...(sources.holidays ? globalEvents : []),
  ];
  const tasks = sources.todos ? scheduledTasks(notes) : [];
  const dayEvents = eventsOnDate(visibleEvents, selectedDate);
  const openEvent = (event: CalendarEvent) =>
    openSheet({ type: "event", event });
  const today = () => {
    const current = new Date();
    setNow(current);
    navigate(view, localDateKey(current));
    setScrollKey((value) => value + 1);
  };
  const searchEvents = query.trim()
    ? visibleEvents
        .filter((event) =>
          `${event.title} ${event.description ?? ""}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
        )
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            (a.time ?? "").localeCompare(b.time ?? ""),
        )
    : [];
  const searchTasks = query.trim()
    ? tasks.filter((task) =>
        task.text
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      )
    : [];
  const taskSearchDates = [...new Set(searchTasks.map((task) => task.dueDate))];
  const title =
    sheet?.type === "form"
      ? sheet.event
        ? "Edit Event"
        : "New Event"
      : sheet?.type === "event"
        ? sheet.event.title
        : sheet?.type === "search"
          ? "Search"
          : sheet?.type === "calendars"
            ? "Calendars"
            : "Inbox";
  return (
    <div className={styles.app} aria-label="Calendar">
      <header className={styles.toolbar}>
        {view !== "year" && (
          <button
            className={styles.pill}
            onClick={() => navigate(view === "day" ? "month" : "year")}
            aria-label={view === "day" ? "Back to month" : "Back to year"}
          >
            <LuChevronLeft />
            <span>
              {view === "day"
                ? date.toLocaleDateString("en", { month: "long" })
                : date.getFullYear()}
            </span>
          </button>
        )}
        <div className={`${styles.pill} ${styles.tools}`}>
          {view !== "year" && (
            <button
              aria-label={
                view === "month"
                  ? "Open day timeline"
                  : list
                    ? "Show timeline"
                    : "Show agenda"
              }
              onClick={() =>
                view === "month" ? navigate("day") : setList((value) => !value)
              }
            >
              {view === "day" ? <LuList /> : <LuRows2 />}
            </button>
          )}
          <button
            aria-label="Search calendar"
            onClick={() => {
              setQuery("");
              openSheet({ type: "search" });
            }}
          >
            <LuSearch />
          </button>
          <button
            aria-label="Add event"
            onClick={() => openSheet({ type: "form" })}
          >
            <LuPlus />
          </button>
        </div>
      </header>
      <main className={styles.main}>
        {view === "year" && (
          <YearOverview
            key={`year-${scrollKey}`}
            selectedDate={selectedDate}
            onSelect={(key) => navigate("month", key)}
          />
        )}
        {view === "month" && (
          <MonthOverview
            key={`month-${scrollKey}`}
            selectedDate={selectedDate}
            onSelect={(key) => navigate("day", key)}
            events={visibleEvents}
            taskDates={new Set(tasks.map((task) => task.dueDate))}
          />
        )}
        {view === "day" && (
          <DayView
            key={`day-${scrollKey}`}
            date={selectedDate}
            now={now}
            events={dayEvents}
            list={list}
            showTasks={
              sources.todos &&
              tasks.some((task) => task.dueDate === selectedDate)
            }
            onDate={(key) => navigate("day", key)}
            onEvent={openEvent}
            onAdd={(time) => openSheet({ type: "form", time })}
          />
        )}
      </main>
      <footer className={styles.footer}>
        <button className={styles.pill} onClick={today}>
          Today
        </button>
        <div className={`${styles.pill} ${styles.tools}`}>
          <button
            aria-label="Choose calendars"
            onClick={() => openSheet({ type: "calendars" })}
          >
            <LuCalendarDays />
          </button>
          <button
            aria-label="Calendar inbox"
            onClick={() => openSheet({ type: "inbox" })}
          >
            <LuInbox />
          </button>
        </div>
      </footer>
      <Dialog.Root
        open={sheet !== null}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      >
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.sheet}
          data-no-turntable
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <div className={styles.sheetHeader}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className={styles.iconButton} aria-label="Close">
              <LuX />
            </Dialog.Close>
          </div>
          <div ref={attachSheetScroll} className={styles.sheetBody}>
            {sheet?.type === "form" && (
              <EventForm
                key={sheet.event?.id ?? "new"}
                event={sheet.event}
                date={selectedDate}
                time={sheet.time}
                onCancel={() => setSheet(null)}
                onSave={(draft) => {
                  if (saveEvent(draft, sheet.event?.id)) {
                    navigate("day", draft.date);
                    setSheet(null);
                  }
                }}
              />
            )}
            {sheet?.type === "event" && (
              <EventDetails
                key={sheet.event.id}
                event={sheet.event}
                onEdit={() => setSheet({ type: "form", event: sheet.event })}
                onDelete={() => {
                  deleteEvent(sheet.event.id);
                  setSheet(null);
                }}
              />
            )}
            {sheet?.type === "search" && (
              <>
                <label className={styles.search}>
                  <LuSearch />
                  <input
                    aria-label="Search events and todos"
                    autoFocus
                    placeholder="Events and todos"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <EventList
                  events={searchEvents}
                  showDate
                  onSelect={openEvent}
                />
                {taskSearchDates.map((key) => (
                  <div key={key} className={styles.searchTaskGroup}>
                    <button
                      onClick={() => {
                        navigate("day", key);
                        setSheet(null);
                      }}
                    >
                      {calendarDate(key).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </button>
                    {searchTasks
                      .filter((task) => task.dueDate === key)
                      .map((task) => (
                        <button
                          key={`${task.listId}:${task.id}`}
                          onClick={() => {
                            navigate("day", key);
                            setSheet(null);
                          }}
                        >
                          {task.text}
                          <small>{task.listTitle} · Todo</small>
                        </button>
                      ))}
                  </div>
                ))}
                {!searchEvents.length && !searchTasks.length && (
                  <p className={styles.empty}>
                    {query.trim()
                      ? "No matching events or todos"
                      : "Search your events and scheduled todos."}
                  </p>
                )}
              </>
            )}
            {sheet?.type === "calendars" && (
              <>
                <p className={styles.explanation}>
                  Choose what appears in your calendar.
                </p>
                {(["events", "holidays", "todos"] as const).map((source) => (
                  <label className={styles.source} key={source}>
                    <input
                      type="checkbox"
                      checked={sources[source]}
                      onChange={(e) =>
                        setSources({ ...sources, [source]: e.target.checked })
                      }
                    />
                    <span>
                      {source === "events"
                        ? "My events"
                        : source === "holidays"
                          ? "Included holidays"
                          : "Notes todos"}
                    </span>
                  </label>
                ))}
                <p className={styles.explanation}>
                  Events are saved in this browser. Todos use the dates and
                  completion state from Notes. Included holidays are a fixed
                  collection, not a live or regional holiday feed.
                </p>
              </>
            )}
            {sheet?.type === "inbox" && (
              <div className={styles.inbox}>
                <LuInbox />
                <h3>No invitations</h3>
                <p>
                  This is a local calendar. Calendar accounts, invitations, and
                  external sync are not connected.
                </p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
