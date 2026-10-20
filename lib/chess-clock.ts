export const TIME_PRESETS = [
  { value: 1, label: "1 min", minutes: 1, increment: 0, category: "Bullet" },
  {
    value: "1+1",
    label: "1 + 1",
    minutes: 1,
    increment: 1,
    category: "Bullet",
  },
  {
    value: "2+1",
    label: "2 + 1",
    minutes: 2,
    increment: 1,
    category: "Bullet",
  },
  { value: 3, label: "3 min", minutes: 3, increment: 0, category: "Blitz" },
  { value: "3+2", label: "3 + 2", minutes: 3, increment: 2, category: "Blitz" },
  { value: 5, label: "5 min", minutes: 5, increment: 0, category: "Blitz" },
  { value: 10, label: "10 min", minutes: 10, increment: 0, category: "Rapid" },
  {
    value: "15+10",
    label: "15 + 10",
    minutes: 15,
    increment: 10,
    category: "Rapid",
  },
  { value: 30, label: "30 min", minutes: 30, increment: 0, category: "Rapid" },
  { value: 15, label: "15 min", minutes: 15, increment: 0, category: "Rapid" },
  { value: 0, label: "Untimed", minutes: 0, increment: 0, category: "Classic" },
] as const;
export type TimeControl = (typeof TIME_PRESETS)[number]["value"];
export const TIME_CONTROLS: readonly TimeControl[] = TIME_PRESETS.map(
  (preset) => preset.value,
);
export function getTimePreset(value: TimeControl) {
  return (
    TIME_PRESETS.find((preset) => preset.value === value) ?? TIME_PRESETS[3]
  );
}
export type ChessClock = {
  white: number;
  black: number;
  turn: "w" | "b";
  since: number | null;
  incrementMs?: number;
};
export function createChessClock(
  control: TimeControl,
  now: number,
): ChessClock {
  const { minutes, increment } = getTimePreset(control);
  return {
    white: minutes * 60000,
    black: minutes * 60000,
    turn: "w",
    since: minutes ? now : null,
    ...(increment ? { incrementMs: increment * 1000 } : {}),
  };
}
export function readChessClock(clock: ChessClock, now: number): ChessClock {
  if (clock.since === null) return clock;
  const key = clock.turn === "w" ? "white" : "black";
  return {
    ...clock,
    [key]: Math.max(0, clock[key] - Math.max(0, now - clock.since)),
    since: now,
  };
}
export function formatChessTime(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
