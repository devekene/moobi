export type TimerDraft = {
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
};
export type RecentTimer = { id: string; seconds: number; label: string };
export type ActiveTimer = {
  id: number;
  label: string;
  status: "running" | "paused" | "ringing";
  duration: number;
  remaining: number;
  deadline: number | null;
  ringingUntil: number | null;
};
export type TimerState = {
  draft: TimerDraft;
  items: ActiveTimer[];
  selectedId: number | null;
  view: "setup" | "list" | "detail";
  nextId: number;
  recents: RecentTimer[];
};
export type TimerAction =
  | { type: "configure"; draft: Partial<TimerDraft> }
  | { type: "start"; now: number; recent?: RecentTimer }
  | { type: "pause" | "resume" | "restart"; id: number; now: number }
  | { type: "tick"; now: number }
  | { type: "cancel"; id: number }
  | { type: "navigate"; view: TimerState["view"]; id?: number }
  | { type: "delete-recent"; id: string };

export const TIMER_RING_DURATION_MS = 120_000;
export const INITIAL_TIMER_STATE: TimerState = {
  draft: { hours: 0, minutes: 4, seconds: 0, label: "" },
  items: [],
  selectedId: null,
  view: "setup",
  nextId: 1,
  recents: [],
};
export const getTimerSeconds = (draft: TimerDraft): number =>
  draft.hours * 3600 + draft.minutes * 60 + draft.seconds;
export const formatTimer = (seconds: number, padMinutes = false): string => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${padMinutes ? String(minutes).padStart(2, "0") : minutes}:${remainder}`;
};
export const describeTimer = (total: number): string => {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return (
    [
      hours ? `${hours} hr` : "",
      minutes ? `${minutes} min` : "",
      seconds ? `${seconds} sec` : "",
    ]
      .filter(Boolean)
      .join(", ") || "0 sec"
  );
};
const remainingAt = (timer: ActiveTimer, now: number) =>
  timer.deadline === null
    ? timer.remaining
    : Math.max(0, Math.ceil((timer.deadline - now) / 1000));
const updateElapsed = (timer: ActiveTimer, now: number): ActiveTimer | null => {
  if (timer.status === "paused") return timer;
  if (timer.status === "ringing")
    return timer.ringingUntil !== null && now >= timer.ringingUntil
      ? null
      : timer;
  const remaining = remainingAt(timer, now);
  if (remaining > 0)
    return remaining === timer.remaining ? timer : { ...timer, remaining };
  const ringingUntil = (timer.deadline ?? now) + TIMER_RING_DURATION_MS;
  // A suspended browser must not replay an alarm whose entire ringing window elapsed.
  if (now >= ringingUntil) return null;
  return {
    ...timer,
    remaining: 0,
    deadline: null,
    status: "ringing",
    ringingUntil,
  };
};
const reconcile = (state: TimerState, items: ActiveTimer[]): TimerState => {
  const selectedExists = items.some((item) => item.id === state.selectedId);
  return {
    ...state,
    items,
    selectedId: selectedExists ? state.selectedId : null,
    view:
      state.view === "detail" && !selectedExists
        ? items.length
          ? "list"
          : "setup"
        : state.view === "list" && !items.length
          ? "setup"
          : state.view,
  };
};
export const getNextTimerTransition = (
  items: readonly ActiveTimer[],
): number | null => {
  const deadlines = items.flatMap((item) =>
    item.status === "running" && item.deadline !== null
      ? [item.deadline]
      : item.status === "ringing" && item.ringingUntil !== null
        ? [item.ringingUntil]
        : [],
  );
  return deadlines.length ? Math.min(...deadlines) : null;
};
export const timerReducer = (
  state: TimerState,
  action: TimerAction,
): TimerState => {
  switch (action.type) {
    case "configure":
      return { ...state, draft: { ...state.draft, ...action.draft } };
    case "navigate":
      if (
        action.view === "detail" &&
        !state.items.some((item) => item.id === action.id)
      )
        return state;
      return {
        ...state,
        view: action.view,
        selectedId: action.view === "detail" ? (action.id ?? null) : null,
      };
    case "start": {
      const duration = action.recent?.seconds ?? getTimerSeconds(state.draft);
      if (duration <= 0) return state;
      const label = (action.recent?.label ?? state.draft.label).trim();
      const recent = { id: `${duration}:${label}`, seconds: duration, label };
      return {
        ...state,
        view: "list",
        selectedId: null,
        nextId: state.nextId + 1,
        items: [
          ...state.items,
          {
            id: state.nextId,
            label,
            status: "running",
            duration,
            remaining: duration,
            deadline: action.now + duration * 1000,
            ringingUntil: null,
          },
        ],
        recents: [
          recent,
          ...state.recents.filter((item) => item.id !== recent.id),
        ].slice(0, 8),
      };
    }
    case "pause":
      return reconcile(
        state,
        state.items.flatMap((item) => {
          if (item.id !== action.id || item.status !== "running") return [item];
          const updated = updateElapsed(item, action.now);
          return updated
            ? [
                updated.status === "running"
                  ? { ...updated, status: "paused" as const, deadline: null }
                  : updated,
              ]
            : [];
        }),
      );
    case "resume":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id && item.status === "paused"
            ? {
                ...item,
                status: "running",
                deadline: action.now + item.remaining * 1000,
              }
            : item,
        ),
      };
    case "restart":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id
            ? {
                ...item,
                status: "running",
                remaining: item.duration,
                deadline: action.now + item.duration * 1000,
                ringingUntil: null,
              }
            : item,
        ),
      };
    case "tick": {
      const items = state.items.flatMap((item) => {
        const updated = updateElapsed(item, action.now);
        return updated ? [updated] : [];
      });
      return items.length === state.items.length &&
        items.every((item, index) => item === state.items[index])
        ? state
        : reconcile(state, items);
    }
    case "cancel":
      return reconcile(
        state,
        state.items.filter((item) => item.id !== action.id),
      );
    case "delete-recent":
      return {
        ...state,
        recents: state.recents.filter((item) => item.id !== action.id),
      };
  }
};
