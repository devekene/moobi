import { describe, expect, it } from "vitest";
import { getHomeIndicatorSwipeAction } from "@/lib/home-indicator";

describe("home indicator swipe", () => {
  it("opens passcode entry on the lock screen only when PIN lock is enabled", () => {
    expect(getHomeIndicatorSwipeAction("screen-lock", true, 200)).toBe(
      "enter-passcode",
    );
    expect(getHomeIndicatorSwipeAction("screen-lock", false, 200)).toBe("none");
  });

  it("preserves short home and long app-switcher swipes while unlocked", () => {
    expect(getHomeIndicatorSwipeAction("notes", false, 300)).toBe("go-home");
    expect(getHomeIndicatorSwipeAction("notes", false, 700)).toBe(
      "show-app-switcher",
    );
  });
});
