"use client";

import React, { useState } from "react";
import { LuAlarmClock, LuGlobe, LuHourglass, LuTimer } from "react-icons/lu";
import { useClock } from "@/context/ClockContext";
import {
  ClockAlarm,
  Stopwatch,
  Timer,
  WorldClock,
} from "@/components/screens/clock";
import { Tabs, TabsContent, type TabItem } from "@/components/ui/tabs";
import { type ClockScreen } from "@/types";

const clockTabs: readonly TabItem<ClockScreen>[] = [
  { value: "alarm", label: "Alarm", icon: <LuAlarmClock /> },
  { value: "world", label: "World Clock", icon: <LuGlobe /> },
  { value: "timer", label: "Timer", icon: <LuHourglass /> },
  { value: "stopwatch", label: "Stopwatch", icon: <LuTimer /> },
];

const Clock = () => {
  const [editorContainer, setEditorContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const {
    currentClockScreen: tab,
    setCurrentClockScreen: setTab,
    timer,
  } = useClock();

  return (
    <div ref={setEditorContainer} className="relative mt-10 h-full w-full">
      <Tabs
        items={clockTabs}
        value={tab}
        onValueChange={setTab}
        label="Clock tabs"
        className="relative h-full"
        listClassName={
          tab === "timer" && timer.view === "detail"
            ? "hidden"
            : "absolute inset-x-2 bottom-0 z-20"
        }
      >
        <TabsContent
          value="alarm"
          className="absolute inset-x-0 top-0 bottom-[72px]"
        >
          <ClockAlarm editorContainer={editorContainer} />
        </TabsContent>
        <TabsContent
          value="world"
          className="absolute inset-x-0 top-0 bottom-[72px]"
        >
          <WorldClock editorContainer={editorContainer} />
        </TabsContent>
        <TabsContent
          value="timer"
          className="absolute inset-x-0 top-0 bottom-0"
        >
          <Timer />
        </TabsContent>
        <TabsContent
          value="stopwatch"
          className="absolute inset-x-0 top-0 bottom-[72px]"
        >
          <Stopwatch />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clock;
