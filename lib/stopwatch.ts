export type StopwatchLap = { id: number; totalMs: number; durationMs: number };
export type StopwatchState = {
  elapsedMs: number;
  startedAt: number | null;
  laps: StopwatchLap[];
  view: "digital" | "analog";
};
export type StopwatchAction =
  | { type: "start" | "stop" | "lap"; now: number }
  | { type: "reset" }
  | { type: "view"; view: StopwatchState["view"] };

export const INITIAL_STOPWATCH_STATE: StopwatchState = {
  elapsedMs: 0,
  startedAt: null,
  laps: [],
  view: "digital",
};
export const getStopwatchElapsed = (
  state: StopwatchState,
  now: number,
): number =>
  Math.max(
    state.laps[0]?.totalMs ?? 0,
    state.elapsedMs +
      (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt)),
  );

export const formatStopwatch = (ms: number): string => {
  const hundredths = Math.floor(Math.max(0, ms) / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor(hundredths / 100) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths % 100).padStart(2, "0")}`;
};
export const getStopwatchLapExtremes = (
  laps: readonly StopwatchLap[],
): { fastest: number; slowest: number } | null => {
  if (laps.length < 2) return null;
  const fastest = laps.reduce((best, lap) =>
    lap.durationMs < best.durationMs ? lap : best,
  );
  const slowest = laps.reduce((worst, lap) =>
    lap.durationMs > worst.durationMs ? lap : worst,
  );
  return fastest.durationMs === slowest.durationMs
    ? null
    : { fastest: fastest.id, slowest: slowest.id };
};
export const stopwatchReducer = (
  state: StopwatchState,
  action: StopwatchAction,
): StopwatchState => {
  switch (action.type) {
    case "start":
      return state.startedAt !== null
        ? state
        : { ...state, startedAt: action.now };
    case "stop":
      return state.startedAt === null
        ? state
        : {
            ...state,
            elapsedMs: getStopwatchElapsed(state, action.now),
            startedAt: null,
          };
    case "lap": {
      if (state.startedAt === null) return state;
      const totalMs = getStopwatchElapsed(state, action.now);
      const previous = state.laps[0];
      const durationMs = totalMs - (previous?.totalMs ?? 0);
      if (durationMs <= 0) return state;
      return {
        ...state,
        laps: [
          { id: (previous?.id ?? 0) + 1, totalMs, durationMs },
          ...state.laps,
        ],
      };
    }
    case "reset":
      return { ...INITIAL_STOPWATCH_STATE, view: state.view };
    case "view":
      return { ...state, view: action.view };
  }
};
