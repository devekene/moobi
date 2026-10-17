import { describe, expect, it } from "vitest";
import {
  INITIAL_STOPWATCH_STATE,
  formatStopwatch,
  getStopwatchElapsed,
  getStopwatchLapExtremes,
  stopwatchReducer,
} from "@/lib/stopwatch";

describe("stopwatch session", () => {
  it("measures elapsed time from timestamps instead of counting scheduled ticks", () => {
    const state = stopwatchReducer(INITIAL_STOPWATCH_STATE, {
      type: "start",
      now: 1000,
    });
    expect(getStopwatchElapsed(state, 31456)).toBe(30456);
    expect(getStopwatchElapsed(state, 3601000)).toBe(3600000);
    expect(stopwatchReducer(state, { type: "start", now: 2000 })).toBe(state);
  });
  it("stops precisely and resumes without including paused time", () => {
    let state = stopwatchReducer(INITIAL_STOPWATCH_STATE, {
      type: "start",
      now: 1000,
    });
    state = stopwatchReducer(state, { type: "stop", now: 2555 });
    expect(state.elapsedMs).toBe(1555);
    expect(getStopwatchElapsed(state, 99999)).toBe(1555);
    state = stopwatchReducer(state, { type: "start", now: 100000 });
    expect(getStopwatchElapsed(state, 100200)).toBe(1755);
  });
  it("records newest-first lap durations and keeps the current lap separate", () => {
    let state = stopwatchReducer(INITIAL_STOPWATCH_STATE, {
      type: "start",
      now: 0,
    });
    state = stopwatchReducer(state, { type: "lap", now: 1234 });
    state = stopwatchReducer(state, { type: "lap", now: 5000 });
    expect(state.laps).toEqual([
      { id: 2, totalMs: 5000, durationMs: 3766 },
      { id: 1, totalMs: 1234, durationMs: 1234 },
    ]);
    expect(getStopwatchElapsed(state, 6500) - state.laps[0].totalMs).toBe(1500);
    expect(stopwatchReducer(state, { type: "lap", now: 5000 })).toBe(state);
  });
  it("ignores laps before start and after stop", () => {
    expect(
      stopwatchReducer(INITIAL_STOPWATCH_STATE, { type: "lap", now: 1234 }),
    ).toBe(INITIAL_STOPWATCH_STATE);
    const stopped = stopwatchReducer(
      stopwatchReducer(INITIAL_STOPWATCH_STATE, { type: "start", now: 0 }),
      { type: "stop", now: 1000 },
    );
    expect(stopwatchReducer(stopped, { type: "lap", now: 2000 })).toBe(stopped);
  });
  it("changes digital/analog views without resetting elapsed time or laps", () => {
    let state = stopwatchReducer(INITIAL_STOPWATCH_STATE, {
      type: "start",
      now: 0,
    });
    state = stopwatchReducer(state, { type: "lap", now: 1234 });
    const analog = stopwatchReducer(state, { type: "view", view: "analog" });
    expect(analog.laps).toBe(state.laps);
    expect(analog.startedAt).toBe(0);
    expect(getStopwatchElapsed(analog, 4500)).toBe(4500);
    expect(stopwatchReducer(analog, { type: "reset" })).toEqual({
      ...INITIAL_STOPWATCH_STATE,
      view: "analog",
    });
  });
  it("never produces a negative lap if the wall clock moves backward", () => {
    let state = stopwatchReducer(INITIAL_STOPWATCH_STATE, {
      type: "start",
      now: 1000,
    });
    state = stopwatchReducer(state, { type: "lap", now: 2000 });
    expect(getStopwatchElapsed(state, 500)).toBe(1000);
    expect(stopwatchReducer(state, { type: "lap", now: 500 })).toBe(state);
  });
  it("highlights completed fastest and slowest laps only when durations differ", () => {
    let state = stopwatchReducer(INITIAL_STOPWATCH_STATE, {
      type: "start",
      now: 0,
    });
    state = stopwatchReducer(state, { type: "lap", now: 1000 });
    expect(getStopwatchLapExtremes(state.laps)).toBeNull();
    state = stopwatchReducer(state, { type: "lap", now: 2000 });
    expect(getStopwatchLapExtremes(state.laps)).toBeNull();
    state = stopwatchReducer(state, { type: "lap", now: 5000 });
    expect(getStopwatchLapExtremes(state.laps)).toEqual({
      fastest: 2,
      slowest: 3,
    });
  });
});

describe("stopwatch formatting", () => {
  it.each([
    [0, "00:00.00"],
    [1239, "00:01.23"],
    [59999, "00:59.99"],
    [60000, "01:00.00"],
    [3600123, "60:00.12"],
    [-100, "00:00.00"],
  ])("formats %s ms", (ms, expected) => {
    expect(formatStopwatch(Number(ms))).toBe(expected);
  });
});
