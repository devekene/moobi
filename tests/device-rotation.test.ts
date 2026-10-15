import { describe, expect, it } from "vitest";
import {
  getTurntableScale,
  getVisibleDeviceSurface,
} from "@/lib/device-rotation";

describe("virtual iPhone turntable", () => {
  it("identifies front, back, sides, top, and bottom from both rotation axes", () => {
    expect(getVisibleDeviceSurface({ pitch: 0, yaw: 0 })).toBe("front");
    expect(getVisibleDeviceSurface({ pitch: 0, yaw: 180 })).toBe("back");
    expect(getVisibleDeviceSurface({ pitch: 0, yaw: 90 })).toBe("left side");
    expect(getVisibleDeviceSurface({ pitch: 0, yaw: -90 })).toBe("right side");
    expect(getVisibleDeviceSurface({ pitch: 90, yaw: 0 })).toBe("top edge");
    expect(getVisibleDeviceSurface({ pitch: -90, yaw: 0 })).toBe("bottom edge");
  });

  it("scales diagonal angles to stay within the viewport", () => {
    const scale = getTurntableScale(
      { width: 300, height: 620 },
      34,
      { pitch: 45, yaw: 45 },
      { width: 390, height: 844 },
    );

    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThan(1);
  });
});
