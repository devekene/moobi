import { describe, expect, it } from "vitest";
import { isPhoneBrowser } from "@/lib/browser-device";

describe("phone browser detection", () => {
  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) Mobile/15E148",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/130.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Android 15; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0",
  ])("recognizes a phone without client hints: %s", (userAgent) => {
    expect(isPhoneBrowser({ userAgent })).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 15; Pixel Tablet) Chrome/130.0 Safari/537.36",
    "Mozilla/5.0 (Android 15; Tablet; rv:130.0) Gecko/130.0 Firefox/130.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
    "",
  ])(
    "keeps controls available on tablets, desktops, and unknown browsers: %s",
    (userAgent) => {
      expect(isPhoneBrowser({ userAgent })).toBe(false);
    },
  );

  it("uses the browser mobile hint when provided", () => {
    expect(
      isPhoneBrowser({
        userAgent: "Reduced UA",
        userAgentData: { mobile: true },
      }),
    ).toBe(true);
    expect(
      isPhoneBrowser({
        userAgent: "Android Mobile",
        userAgentData: { mobile: false },
      }),
    ).toBe(false);
  });

  it("recognizes iPad desktop mode and keeps tablet controls available", () => {
    expect(
      isPhoneBrowser({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
        userAgentData: { mobile: true },
      }),
    ).toBe(false);
  });

  it("does not treat touch support as proof that a laptop is a phone", () => {
    expect(
      isPhoneBrowser({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0",
        platform: "Win32",
        maxTouchPoints: 10,
      }),
    ).toBe(false);
  });
});
