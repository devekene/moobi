import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INITIAL_STOPWATCH_STATE,
  stopwatchReducer,
  type StopwatchState,
} from "@/lib/stopwatch";
import Stopwatch from "@/components/screens/clock/Stopwatch";

let stopwatch: StopwatchState;
vi.mock("@/context/ClockContext", () => ({
  useClock: () => ({ stopwatch, dispatchStopwatch: () => {} }),
}));

describe("Stopwatch screen", () => {
  beforeEach(() => {
    stopwatch = INITIAL_STOPWATCH_STATE;
  });
  it("shows the clean digital readout and named display controls", () => {
    const markup = renderToStaticMarkup(createElement(Stopwatch));
    expect(markup).toContain("00:00.00");
    expect(markup).toContain('aria-label="Start stopwatch"');
    const lapButton = markup.match(
      /<button[^>]*aria-label="Record lap"[^>]*>/,
    )?.[0];
    expect(lapButton).toContain('disabled=""');
    expect(markup).toContain('aria-label="Digital stopwatch"');
    expect(markup).toContain('aria-label="Analog stopwatch"');
    expect(markup).not.toContain("Timer");
  });
  it("offers Lap and Stop while running", () => {
    stopwatch = stopwatchReducer(stopwatch, { type: "start", now: 0 });
    const markup = renderToStaticMarkup(createElement(Stopwatch));
    expect(markup).toContain('aria-label="Stop stopwatch"');
    expect(markup).toContain('aria-label="Record lap"');
    expect(markup).toContain("Lap 1");
  });
  it("renders the analog dial, paused controls, and non-color lap distinctions", () => {
    stopwatch = stopwatchReducer(stopwatch, { type: "start", now: 0 });
    stopwatch = stopwatchReducer(stopwatch, { type: "lap", now: 1000 });
    stopwatch = stopwatchReducer(stopwatch, { type: "lap", now: 3000 });
    stopwatch = stopwatchReducer(stopwatch, { type: "stop", now: 4500 });
    stopwatch = stopwatchReducer(stopwatch, { type: "view", view: "analog" });
    const markup = renderToStaticMarkup(createElement(Stopwatch));
    expect(markup).toContain("<svg");
    expect(markup).toContain("00:04.50");
    expect(markup).toContain('aria-label="Reset stopwatch"');
    expect(markup).toContain('aria-label="Start stopwatch"');
    expect(markup).toContain("Lap 1, 00:01.00, fastest");
    expect(markup).toContain("Lap 2, 00:02.00, slowest");
    expect(markup).toContain("Current lap 3, 00:01.50");
  });
});
