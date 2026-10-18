import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { encryptedStorage } from "@/lib/encrypted-storage";
import {
  isCalendarEvent,
  isCalendarDate,
  validEventDraft,
  type CalendarView,
  type EventDraft,
} from "@/lib/calendar";
import { localDateKey } from "@/lib/todos";
import type { CalendarEvent } from "@/types";

type CalendarState = {
  events: CalendarEvent[];
  selectedDate: string;
  view: CalendarView;
  navigate: (view: CalendarView, date?: string) => void;
  saveEvent: (draft: EventDraft, id?: string) => string | null;
  deleteEvent: (id: string) => void;
};
export const createCalendarStore = (storage: StateStorage) =>
  create<CalendarState>()(
    persist(
      (set, get) => ({
        events: [],
        selectedDate: localDateKey(),
        view: "year",
        navigate: (view, date) =>
          set({
            view,
            ...(isCalendarDate(date) ? { selectedDate: date } : {}),
          }),
        saveEvent: (draft, id) => {
          if (
            !validEventDraft(draft) ||
            (id && !get().events.some((event) => event.id === id))
          )
            return null;
          const event: CalendarEvent = {
            ...draft,
            id: id ?? crypto.randomUUID(),
            title: draft.title.trim(),
            description: draft.description?.trim() || undefined,
            time: draft.time || undefined,
            isGlobal: false,
          };
          set((state) => ({
            events: id
              ? state.events.map((item) => (item.id === id ? event : item))
              : [...state.events, event],
            selectedDate: event.date,
          }));
          return event.id;
        },
        deleteEvent: (id) =>
          set((state) => ({
            events: state.events.filter((event) => event.id !== id),
          })),
      }),
      {
        name: "moobi-calendar",
        storage: createJSONStorage(() => storage),
        skipHydration: storage === encryptedStorage,
        partialize: ({ events }) => ({ events }),
        merge: (saved, current) => ({
          ...current,
          events:
            saved &&
            typeof saved === "object" &&
            "events" in saved &&
            Array.isArray(saved.events)
              ? saved.events.filter(isCalendarEvent)
              : [],
        }),
      },
    ),
  );
export const useCalendarStore = createCalendarStore(encryptedStorage);
