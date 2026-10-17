"use client";

import { localDateKey } from "@/lib/todos";
import type React from "react";
import { useState } from "react";
import { CalendarEvent, CalendarEventCategory, CalendarScreen } from "@/types";
import { globalEvents } from "@/constants";
import EventForm from "./EventForm";
import CalendarHome from "./CalendarHome";
import EventDetails from "./EventDetails";

export const CATEGORY_COLORS: Record<CalendarEventCategory, string> = {
  event: "bg-blue-500",
  birthday: "bg-orange-500",
  anniversary: "bg-yellow-500",
  holiday: "bg-orange-700",
  other: "bg-gray-500",
};

const CalendarApp = () => {
  const [selectedDate, setSelectedDate] = useState<string>(localDateKey());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(globalEvents);
  const [screen, setScreen] = useState<CalendarScreen>("home");
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  return (
    <div className="relative flex flex-col px-3">
      {screen === "home" && (
        <CalendarHome
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          allEvents={allEvents}
          setScreen={setScreen}
          setSelectedEvent={setSelectedEvent}
        />
      )}

      {screen === "add-edit" && (
        <EventForm
          eventToEdit={eventToEdit}
          setEventToEdit={setEventToEdit}
          setAllEvents={setAllEvents}
          selectedDate={selectedDate}
          setScreen={setScreen}
        />
      )}

      {screen === "event" && selectedEvent && (
        <EventDetails
          event={selectedEvent}
          setEventToEdit={setEventToEdit}
          setScreen={setScreen}
          setAllEvents={setAllEvents}
        />
      )}
    </div>
  );
};

export default CalendarApp;
