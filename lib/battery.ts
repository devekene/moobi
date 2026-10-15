export const BATTERY_CAPACITY = 100;
export const LOW_BATTERY_THRESHOLD = 20;
export const DEFAULT_BATTERY_RATES = {
  drainPerMinute: 0.04,
  chargePerMinute: 0.8,
} as const;
export const CHARGER_CONNECTION_DURATION_MS = 700;

export type ChargerPhase = "disconnected" | "connecting" | "connected";
export type BatteryRates = { drainPerMinute: number; chargePerMinute: number };

export const advanceBatteryLevel = (
  level: number,
  phase: ChargerPhase,
  elapsedMs: number,
  rates: BatteryRates = DEFAULT_BATTERY_RATES,
): number => {
  if (elapsedMs <= 0) return level;
  const rate = phase === "connected" ? rates.chargePerMinute : -rates.drainPerMinute;
  const nextLevel = level + (elapsedMs / 60_000) * rate;
  return Math.min(BATTERY_CAPACITY, Math.max(0, nextLevel));
};
