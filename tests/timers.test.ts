import { describe, expect, it } from "vitest";
import {
  INITIAL_TIMER_STATE,
  TIMER_RING_DURATION_MS,
  describeTimer,
  formatTimer,
  getNextTimerTransition,
  getTimerSeconds,
  timerReducer,
} from "@/lib/timers";

const start = (seconds = 120, now = 0) =>
  timerReducer(
    {
      ...INITIAL_TIMER_STATE,
      draft: { hours: 0, minutes: 0, seconds, label: "Tea" },
    },
    { type: "start", now },
  );

describe("timer lifecycle", () => {
  it("opens an active list after starting and opens detail without resetting the countdown", () => {
    const running = start();
    expect(running.view).toBe("list");
    expect(running.items[0]).toMatchObject({
      status: "running",
      remaining: 120,
      deadline: 120000,
      label: "Tea",
    });
    const detail = timerReducer(running, {
      type: "navigate",
      view: "detail",
      id: 1,
    });
    expect(detail.selectedId).toBe(1);
    expect(detail.view).toBe("detail");
    expect(detail.items).toBe(running.items);
    expect(timerReducer(detail, { type: "navigate", view: "list" }).items).toBe(
      running.items,
    );
  });

  it("supports adding a timer without changing an existing one", () => {
    const first = start();
    const setup = timerReducer(first, { type: "navigate", view: "setup" });
    const configured = timerReducer(setup, {
      type: "configure",
      draft: { seconds: 30, label: "Coffee" },
    });
    const second = timerReducer(configured, { type: "start", now: 1000 });
    expect(second.items).toHaveLength(2);
    expect(second.items[0]).toBe(first.items[0]);
    expect(second.items[1]).toMatchObject({
      id: 2,
      duration: 30,
      label: "Coffee",
    });
  });

  it("does not start zero-duration timers", () => {
    const zero = {
      ...INITIAL_TIMER_STATE,
      draft: { hours: 0, minutes: 0, seconds: 0, label: "" },
    };
    expect(timerReducer(zero, { type: "start", now: 0 })).toBe(zero);
  });

  it("pauses using elapsed time, then resumes from the remaining duration", () => {
    const paused = timerReducer(start(), { type: "pause", id: 1, now: 11000 });
    expect(paused.items[0]).toMatchObject({
      status: "paused",
      remaining: 109,
      deadline: null,
    });
    expect(timerReducer(paused, { type: "tick", now: 999000 })).toBe(paused);
    const resumed = timerReducer(paused, {
      type: "resume",
      id: 1,
      now: 100000,
    });
    expect(resumed.items[0]).toMatchObject({
      status: "running",
      deadline: 209000,
    });
    expect(resumed.recents).toHaveLength(1);
  });

  it("rings continuously for exactly two minutes after the countdown deadline", () => {
    const ringing = timerReducer(start(), { type: "tick", now: 120000 });
    expect(TIMER_RING_DURATION_MS).toBe(120000);
    expect(ringing.items[0]).toMatchObject({
      status: "ringing",
      remaining: 0,
      ringingUntil: 240000,
    });
    expect(getNextTimerTransition(ringing.items)).toBe(240000);
    expect(
      timerReducer(ringing, { type: "tick", now: 239999 }).items,
    ).toHaveLength(1);
    const stopped = timerReducer(ringing, { type: "tick", now: 240000 });
    expect(stopped.items).toEqual([]);
    expect(stopped.view).toBe("setup");
    expect(getNextTimerTransition(stopped.items)).toBeNull();
    expect(stopped.recents).toHaveLength(1);
  });

  it("does not replay an expired ring when the browser resumes late", () => {
    expect(timerReducer(start(), { type: "tick", now: 400000 }).items).toEqual(
      [],
    );
    const late = timerReducer(start(), { type: "tick", now: 180000 });
    expect(late.items[0].ringingUntil).toBe(240000);
    expect(timerReducer(late, { type: "tick", now: 240000 }).items).toEqual([]);
  });

  it("restarts a ringing timer with its original duration and clears its old timeout", () => {
    const ringing = timerReducer(start(), { type: "tick", now: 120000 });
    const restarted = timerReducer(ringing, {
      type: "restart",
      id: 1,
      now: 130000,
    });
    expect(restarted.items[0]).toMatchObject({
      status: "running",
      remaining: 120,
      deadline: 250000,
      ringingUntil: null,
    });
    expect(
      timerReducer(restarted, { type: "tick", now: 240000 }).items[0].remaining,
    ).toBe(10);
  });

  it("stops only the requested timer and returns from a deleted detail", () => {
    let state = timerReducer(start(), { type: "start", now: 1000 });
    state = timerReducer(state, { type: "navigate", view: "detail", id: 1 });
    state = timerReducer(state, { type: "cancel", id: 1 });
    expect(state.items.map((item) => item.id)).toEqual([2]);
    expect(state.view).toBe("list");
    expect(state.selectedId).toBeNull();
    expect(state.recents).toHaveLength(1);
  });

  it("handles a pause pressed at the exact deadline as ringing", () => {
    expect(
      timerReducer(start(), { type: "pause", id: 1, now: 120000 }).items[0]
        .status,
    ).toBe("ringing");
  });

  it("keeps recents deduplicated, bounded, and separate from active timers", () => {
    let state = INITIAL_TIMER_STATE;
    for (let seconds = 1; seconds <= 10; seconds++) {
      state = timerReducer(state, {
        type: "configure",
        draft: { minutes: 0, seconds },
      });
      state = timerReducer(state, { type: "start", now: 0 });
    }
    expect(state.recents).toHaveLength(8);
    expect(state.items).toHaveLength(10);
    state = timerReducer(state, {
      type: "start",
      now: 0,
      recent: state.recents[0],
    });
    expect(state.recents).toHaveLength(8);
    const id = state.recents[0].id;
    state = timerReducer(state, { type: "delete-recent", id });
    expect(state.recents.some((item) => item.id === id)).toBe(false);
    expect(state.items).toHaveLength(11);
  });
});

describe("timer presentation", () => {
  it.each([
    [0, "0:00", "0 sec"],
    [240, "4:00", "4 min"],
    [65, "1:05", "1 min, 5 sec"],
    [3661, "1:01:01", "1 hr, 1 min, 1 sec"],
  ])("formats %s seconds", (total, display, description) => {
    expect(formatTimer(Number(total))).toBe(display);
    expect(describeTimer(Number(total))).toBe(description);
  });
  it("pads active minutes while keeping recent durations compact", () => {
    expect(formatTimer(56, true)).toBe("00:56");
    expect(formatTimer(240)).toBe("4:00");
    expect(
      getTimerSeconds({ hours: 2, minutes: 3, seconds: 4, label: "" }),
    ).toBe(7384);
  });
});
