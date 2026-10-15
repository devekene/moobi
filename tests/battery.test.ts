import { describe, expect, it } from "vitest";
import {
  advanceBatteryLevel,
  BATTERY_CAPACITY,
  LOW_BATTERY_THRESHOLD,
} from "@/lib/battery";

describe("virtual battery model", () => {
  it("drains at a steady, configurable rate while disconnected", () => {
    expect(
      advanceBatteryLevel(85, "disconnected", 60_000, {
        drainPerMinute: 0.04,
        chargePerMinute: 0.8,
      }),
    ).toBe(84.96);
  });

  it("charges at a steady rate and clamps at capacity", () => {
    expect(
      advanceBatteryLevel(50, "connected", 60_000, {
        drainPerMinute: 2,
        chargePerMinute: 4,
      }),
    ).toBe(54);
    expect(advanceBatteryLevel(99.9, "connected", 60_000)).toBe(BATTERY_CAPACITY);
  });

  it("never drains below empty and uses a stable low battery threshold", () => {
    expect(advanceBatteryLevel(0.01, "disconnected", 60_000)).toBe(0);
    expect(LOW_BATTERY_THRESHOLD).toBe(20);
  });
});
