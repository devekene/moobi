import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alarm } from "@/types";
import ClockAlarm from "@/components/screens/clock/ClockAlarm";

let alarms: Alarm[] = [];
vi.mock("@/context/ClockContext", () => ({
  useClock: () => ({ alarms, setAlarms: () => {} }),
}));

describe("alarm screen", () => {
  beforeEach(() => {
    alarms = [];
  });

  it("shows the reference empty state with working entry points", () => {
    const markup = renderToStaticMarkup(createElement(ClockAlarm));
    expect(markup).toContain("Sleep | Wake Up");
    expect(markup).toContain("No Alarm");
    expect(markup).toContain('aria-label="Add alarm"');
    expect(markup).toContain('aria-label="Set up wake-up alarm"');
    expect(markup).not.toContain("No alarms yet");
  });

  it("renders existing alarms with separate edit actions and accessible switches", () => {
    alarms = [
      {
        id: 1,
        time: "06:05",
        label: "Work",
        enabled: false,
        repeatMode: "weekday",
      },
    ];
    const markup = renderToStaticMarkup(createElement(ClockAlarm));
    expect(markup).toContain("6:05");
    expect(markup).toContain("Work, Weekdays");
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-checked="false"');
    expect(markup).toContain('aria-label="Edit 6:05 AM alarm, Work, Weekdays"');
  });

  it("shows the configured wake-up time in the sleep section without duplicating the alarm", () => {
    alarms = [
      {
        id: 1,
        time: "07:00",
        label: "Wake Up",
        enabled: true,
        repeatMode: "daily",
        isWakeUp: true,
      },
    ];
    const markup = renderToStaticMarkup(createElement(ClockAlarm));
    expect(markup).toContain("7:00 AM");
    expect(markup).toContain('aria-label="Change wake-up alarm"');
    expect(markup).not.toContain('aria-label="Other alarms"');
    expect(markup).not.toContain("No Alarm");
  });
});
