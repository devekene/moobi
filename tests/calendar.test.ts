import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  calendarDate,
  eventsOnDate,
  isCalendarEvent,
  monthDays,
  shiftDate,
  weekDays,
  type EventDraft,
} from "@/lib/calendar";
import { createCalendarStore } from "@/stores/useCalendarStore";
import CalendarGrid from "@/components/screens/calendar/CalendarGrid";
import type { StateStorage } from "zustand/middleware";

function setup() {
  const data = new Map<string, string>();
  const storage: StateStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return { store: createCalendarStore(storage), storage, data };
}
const draft: EventDraft = {
  title: " Planning ",
  date: "2026-10-17",
  time: "09:30",
  category: "event",
  description: " Notes ",
};

describe("calendar navigation", () => {
  it("lays out Monday-first months, including leap years and six-row months", () => {
    const october = monthDays(2026, 9);
    expect(october.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(october.filter(Boolean)).toHaveLength(31);
    expect(monthDays(2028, 1)).toContain("2028-02-29");
    expect(monthDays(2026, 1)).not.toContain("2026-02-29");
    expect(monthDays(2026, 2)).toHaveLength(42);
    expect(monthDays(2026, 2)).toContain("2026-03-31");
  });
  it("keeps local dates across weeks, months and year boundaries", () => {
    expect(weekDays("2027-01-01")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(calendarDate("2026-10-17").getDate()).toBe(17);
  });
  it("retains date and view when an app unmounts and rejects invalid navigation dates", () => {
    const { store } = setup();
    store.getState().navigate("month", "2028-02-29");
    store.getState().navigate("day");
    expect(store.getState()).toMatchObject({
      selectedDate: "2028-02-29",
      view: "day",
    });
    store.getState().navigate("year", "2026-02-29");
    expect(store.getState().selectedDate).toBe("2028-02-29");
  });
});

describe("local event lifecycle", () => {
  it("creates, edits, reschedules, restores and deletes events without duplication", () => {
    const { store, storage } = setup();
    const id = store.getState().saveEvent(draft)!;
    expect(store.getState().events[0]).toMatchObject({
      title: "Planning",
      description: "Notes",
      isGlobal: false,
    });
    expect(
      store
        .getState()
        .saveEvent(
          { ...draft, title: "Updated", date: "2026-10-18", time: undefined },
          id,
        ),
    ).toBe(id);
    const restored = createCalendarStore(storage);
    expect(restored.getState().events).toHaveLength(1);
    expect(eventsOnDate(restored.getState().events, "2026-10-17")).toEqual([]);
    expect(
      eventsOnDate(restored.getState().events, "2026-10-18")[0].time,
    ).toBeUndefined();
    restored.getState().deleteEvent(id);
    expect(createCalendarStore(storage).getState().events).toEqual([]);
  });
  it("rejects empty titles, impossible dates, invalid times and missing edit targets", () => {
    const { store } = setup();
    for (const patch of [
      { title: " " },
      { date: "2026-02-29" },
      { date: "1899-12-31" },
      { date: "2101-01-01" },
      { time: "24:00" },
      { time: "09:61" },
    ])
      expect(store.getState().saveEvent({ ...draft, ...patch })).toBeNull();
    expect(store.getState().saveEvent(draft, "missing")).toBeNull();
    expect(store.getState().events).toEqual([]);
  });
  it("filters malformed stored records and keeps valid events", () => {
    const { store, storage, data } = setup();
    store.getState().saveEvent(draft);
    const event = store.getState().events[0];
    data.set(
      "moobi-calendar",
      JSON.stringify({
        state: {
          events: [
            event,
            { ...event, date: "bad" },
            { ...event, time: "25:10" },
            { ...event, isGlobal: true },
            null,
          ],
        },
        version: 0,
      }),
    );
    expect(createCalendarStore(storage).getState().events).toEqual([event]);
    expect(isCalendarEvent({ ...event, description: 5 })).toBe(false);
  });
  it("sorts all-day events before timed events without mutating the source", () => {
    const { store } = setup();
    store.getState().saveEvent({ ...draft, title: "Late", time: "19:00" });
    store.getState().saveEvent({ ...draft, title: "Morning", time: "08:00" });
    store.getState().saveEvent({ ...draft, title: "All day", time: undefined });
    expect(
      eventsOnDate(store.getState().events, draft.date).map(
        (event) => event.title,
      ),
    ).toEqual(["All day", "Morning", "Late"]);
    expect(store.getState().events[0].title).toBe("Late");
  });
});

it("exposes date selection, todo discovery and event titles in the month grid", () => {
  const markup = renderToStaticMarkup(
    createElement(CalendarGrid, {
      currentDate: new Date(2026, 9, 1),
      selectedDate: draft.date,
      setSelectedDate: () => {},
      taskDates: new Set([draft.date]),
      getEventsForDate: (date) =>
        date === draft.date ? [{ ...draft, id: "one", isGlobal: false }] : [],
    }),
  );
  expect(markup).toContain(
    'aria-label="2026-10-17, scheduled todos, 1 events"',
  );
  expect(markup).toContain('aria-pressed="true"');
  expect(markup).toContain("Planning");
  expect(markup).toContain("Todos");
});
