export const PHONE_VOLUME_STEP = 6;

export type HardwareButtonId =
  "volume-up" | "volume-down" | "action" | "side" | "camera-control";

export const VOLUME_BUTTON_SCREEN_TOP_RATIO = {
  "volume-up": 0.24,
  "volume-down": 0.35,
} as const;

export const isHardwareButtonId = (value: unknown): value is HardwareButtonId =>
  value === "volume-up" ||
  value === "volume-down" ||
  value === "action" ||
  value === "side" ||
  value === "camera-control";
