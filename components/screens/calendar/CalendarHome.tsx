import CalendarTasks from "./CalendarTasks";
import { scheduledTasks, localDateKey } from "@/lib/todos";
import { useNotesStore } from "@/stores/useNotesStore";
import { Button } from "@/components/ui/button";
import { LuChevronLeft, LuChevronRight, LuPlus } from "react-icons/lu";
import { CgMoreVertical } from "react-icons/cg";
import CalendarGrid from "@/components/screens/calendar/CalendarGrid";
import EventList from "@/components/screens/calendar/EventList";
import { CalendarEvent, CalendarScreen } from "@/types";
import { Dispatch, SetStateAction, useState } from "react";

interface CalendarHomeProps {
  selectedDate: string;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  allEvents: CalendarEvent[];
  setScreen: Dispatch<SetStateAction<CalendarScreen>>;
  setSelectedEvent: Dispatch<SetStateAction<CalendarEvent | null>>;
}

const CalendarHome = ({
  selectedDate,
  setSelectedDate,
  allEvents,
  setScreen,
  setSelectedEvent,
}: CalendarHomeProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const notes = useNotesStore((state) => state.notes);
  const taskDates = new Set(scheduledTasks(notes).map((task) => task.dueDate));

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(localDateKey());
  };

  // Get events for a specific date
  const getEventsForDate = (date: string) => {
    return allEvents.filter((event) => event.date === date);
  };

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="mb-4 flex items-end justify-end gap-4">
        <Button
          onClick={() => setScreen("add-edit")}
          className="rounded-full border-0 bg-transparent p-2 text-white hover:bg-transparent"
        >
          <LuPlus />
        </Button>
        <Button className="bg-transparent p-0 text-white">
          <CgMoreVertical />
        </Button>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Calendar</h1>
        <Button
          onClick={goToToday}
          className="rounded-full border-0 bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
        >
          Today
        </Button>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <Button
          onClick={goToPreviousMonth}
          className="rounded-full border-0 bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <LuChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-base font-semibold text-white">{monthYear}</h2>
        <Button
          onClick={goToNextMonth}
          className="rounded-full border-0 bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <LuChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <CalendarGrid
        taskDates={taskDates}
        currentDate={currentDate}
        getEventsForDate={getEventsForDate}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      <CalendarTasks date={selectedDate} />
      <EventList
        getEventsForDate={getEventsForDate}
        selectedDate={selectedDate}
        setSelectedEvent={setSelectedEvent}
        setScreen={setScreen}
      />
    </>
  );
};
export default CalendarHome;
