import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alarm } from "@/types";
import AlarmRingOverlay from "@/components/screens/clock/AlarmRingOverlay";

let ringingAlarm: Alarm | undefined;
vi.mock("@/context/ClockContext", () => ({
  useClock: () => ({
    alarms: ringingAlarm ? [ringingAlarm] : [],
    ringingAlarmId: ringingAlarm?.id ?? null,
    setAlarms: () => {},
    setRingingAlarmId: () => {},
    alarmAudioRef: { current: null },
  }),
}));

describe("ringing alarm snooze controls", () => {
  beforeEach(() => {
    ringingAlarm = {
      id: 1,
      time: "07:00",
      label: "Morning",
      enabled: true,
      repeatMode: "once",
    };
  });

  it("keeps snooze available for legacy alarms", () => {
    const markup = renderToStaticMarkup(createElement(AlarmRingOverlay));
    expect(markup).toContain("Snooze");
    expect(markup).toContain("Stop");
    expect(markup).toContain('aria-label="Ringing alarm"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("07:00");
    expect(markup).toContain("Morning");
    expect(markup).toContain('aria-label="Snooze alarm for 9 minutes"');
    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toContain("aria-modal");
  });

  it("hides snooze when it was disabled in the editor", () => {
    if (!ringingAlarm) throw new Error("Missing test alarm");
    ringingAlarm.snoozeEnabled = false;
    const markup = renderToStaticMarkup(createElement(AlarmRingOverlay));
    expect(markup).not.toContain("Snooze");
    expect(markup).toContain("Stop");
  });

  it("announces an empty label as Alarm and names the configured snooze duration", () => {
    if (!ringingAlarm) throw new Error("Missing test alarm");
    ringingAlarm.label = "  ";
    ringingAlarm.snoozeDuration = 15;
    const markup = renderToStaticMarkup(createElement(AlarmRingOverlay));
    expect(markup).toContain("07:00, Alarm. Alarm ringing.");
    expect(markup).toContain('aria-label="Snooze alarm for 15 minutes"');
  });

  it("renders nothing when the ringing alarm has been removed", () => {
    ringingAlarm = undefined;
    expect(renderToStaticMarkup(createElement(AlarmRingOverlay))).toBe("");
  });
});
