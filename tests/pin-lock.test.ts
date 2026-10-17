import { describe, expect, it } from "vitest";
import { appendPhonePinDigit, matchesPhonePin } from "@/lib/pin-lock";

describe("simulated phone PIN", () => {
  it("accepts one numeric key at a time and stops after four digits", () => {
    expect(appendPhonePinDigit("", "0")).toBe("0");
    expect(appendPhonePinDigit("042", "7")).toBe("0427");
    expect(appendPhonePinDigit("0427", "5")).toBeNull();
    expect(appendPhonePinDigit("12", "x")).toBeNull();
  });

  it("matches only a complete four-digit configured PIN", () => {
    expect(matchesPhonePin("0427", "0427")).toBe(true);
    expect(matchesPhonePin("0428", "0427")).toBe(false);
    expect(matchesPhonePin("427", "0427")).toBe(false);
    expect(matchesPhonePin("0427", null)).toBe(false);
  });
});

describe("passcode setup shared by Settings and Phone options", () => {
  it("accepts matching four-digit PINs including a leading zero", async () => {
    const { validatePhonePinSetup } = await import("@/lib/pin-lock");
    expect(validatePhonePinSetup("0427", "0427")).toBeNull();
  });

  it("rejects incomplete, nonnumeric and mismatched PINs", async () => {
    const { validatePhonePinSetup } = await import("@/lib/pin-lock");
    for (const pin of ["", "123", "12345", "12ab", " 123"]) {
      expect(validatePhonePinSetup(pin, pin)).toBe(
        "Enter a four-digit passcode.",
      );
    }
    expect(validatePhonePinSetup("0427", "0428")).toBe(
      "The passcodes do not match.",
    );
  });
});
