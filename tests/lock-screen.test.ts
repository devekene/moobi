import { describe, expect, it } from "vitest";
import { getLockScreenTimePresentation } from "@/lib/lock-screen";

describe("lock screen time presentation", () => {
  it("keeps the glass clock at its default size when notifications cannot scroll", () => {
    expect(getLockScreenTimePresentation(160, false)).toEqual({
      scale: 1,
      holdOffset: 0,
    });
  });

  it("compresses the clock while holding it in place, then lets it scroll away", () => {
    const compressed = getLockScreenTimePresentation(120, true);
    expect(compressed.scale).toBeCloseTo(2 / 3);
    expect(compressed.holdOffset).toBe(120);
    expect(getLockScreenTimePresentation(220, true)).toEqual({
      scale: 0.66,
      holdOffset: 120,
    });
  });

  it("does not allow negative scroll values to enlarge or offset the clock", () => {
    expect(getLockScreenTimePresentation(-10, true)).toEqual({
      scale: 1,
      holdOffset: 0,
    });
  });
});
