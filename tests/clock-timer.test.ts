import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INITIAL_TIMER_STATE,
  timerReducer,
  type TimerState,
} from "@/lib/timers";
import Timer from "@/components/screens/clock/Timer";
import TimerRingBanner from "@/components/screens/clock/TimerRingBanner";

let timer: TimerState;
vi.mock("@/context/ClockContext", () => ({
  useClock: () => ({ timer, dispatchTimer: () => {} }),
}));

describe("Timer screens", () => {
  beforeEach(() => {
    timer = INITIAL_TIMER_STATE;
  });
  it("offers labeled wheels, sound preview, and an honest empty history", () => {
    const markup = renderToStaticMarkup(createElement(Timer));
    for (const label of [
      "Hours",
      "Minutes",
      "Seconds",
      "Start timer",
      "Timer label",
      "Preview timer sound",
    ])
      expect(markup).toContain(`aria-label="${label}"`);
    expect(markup).toContain("Your recently started timers will appear here.");
  });
  it("shows the compact active row with separate detail and pause actions", () => {
    timer = timerReducer(timer, { type: "start", now: 0 });
    const markup = renderToStaticMarkup(createElement(Timer));
    expect(markup).toContain('aria-label="Active timers"');
    expect(markup).toContain('aria-label="Open 4 min timer"');
    expect(markup).toContain('aria-label="Pause timer, 4 min"');
    expect(markup).toContain('aria-label="Add timer"');
    expect(markup).not.toContain('role="spinbutton"');
    expect(markup).not.toContain('aria-label="Back to timers"');
  });
  it("shows a full detail view with back and resume controls", () => {
    timer = timerReducer(timer, { type: "start", now: 0 });
    timer = timerReducer(timer, { type: "pause", id: 1, now: 1000 });
    timer = timerReducer(timer, { type: "navigate", view: "detail", id: 1 });
    const markup = renderToStaticMarkup(createElement(Timer));
    expect(markup).toContain('aria-label="Back to timers"');
    expect(markup).toContain('aria-label="Resume timer"');
    expect(markup).toContain("Paused");
    expect(markup).not.toContain("Recents");
  });
  it("renders the nonmodal ringing banner with restart and stop controls", () => {
    timer = timerReducer(timer, { type: "start", now: 0 });
    timer = timerReducer(timer, { type: "tick", now: 240000 });
    const markup = renderToStaticMarkup(createElement(TimerRingBanner));
    expect(markup).toContain('aria-label="Ringing timer"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-label="Restart ringing timer"');
    expect(markup).toContain('aria-label="Stop ringing timer"');
    expect(markup).not.toContain('role="dialog"');
    timer = timerReducer(timer, { type: "tick", now: 360000 });
    expect(renderToStaticMarkup(createElement(TimerRingBanner))).toBe("");
  });
});
