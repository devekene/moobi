import type { CalendarEvent, CalendarEventCategory } from "@/types";
import { isTaskDate, localDateKey } from "./todos";

export const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
export const CATEGORIES: readonly CalendarEventCategory[] = [
  "event",
  "birthday",
  "anniversary",
  "holiday",
  "other",
];
export type CalendarView = "year" | "month" | "day";
export type EventDraft = Omit<CalendarEvent, "id" | "isGlobal">;
export const calendarDate = (key: string) => new Date(`${key}T12:00:00`);
export function monthDays(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) =>
    i < offset || i >= offset + count
      ? null
      : localDateKey(new Date(year, month, i - offset + 1)),
  );
}
export function weekDays(key: string): string[] {
  const date = calendarDate(key);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) =>
    localDateKey(
      new Date(date.getFullYear(), date.getMonth(), date.getDate() + i),
    ),
  );
}
export function shiftDate(key: string, days: number): string {
  const date = calendarDate(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}
export function isCalendarDate(value: unknown): value is string {
  return isTaskDate(value) && value >= "1900-01-01" && value <= "2100-12-31";
}
export function validEventDraft(event: EventDraft): boolean {
  return (
    Boolean(event.title.trim()) &&
    isCalendarDate(event.date) &&
    CATEGORIES.includes(event.category) &&
    (!event.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time))
  );
}
export function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    Boolean(value.title.trim()) &&
    "date" in value &&
    isCalendarDate(value.date) &&
    "category" in value &&
    CATEGORIES.some((category) => category === value.category) &&
    "isGlobal" in value &&
    value.isGlobal === false &&
    (!("description" in value) ||
      value.description === undefined ||
      typeof value.description === "string") &&
    (!("time" in value) ||
      value.time === undefined ||
      (typeof value.time === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)))
  );
}
export function eventsOnDate(events: readonly CalendarEvent[], date: string) {
  return events
    .filter((event) => event.date === date)
    .sort(
      (a, b) =>
        (a.time ?? "").localeCompare(b.time ?? "") ||
        a.title.localeCompare(b.title),
    );
}
