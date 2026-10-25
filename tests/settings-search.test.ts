import { describe, expect, it } from "vitest";
import { matchesSettingsSearch } from "../components/screens/settings/settings-search";

const display = {
  title: "Display & Brightness",
  subtitle: "Appearance and screen brightness",
};
const security = {
  title: "Security",
  subtitle: "PIN lock for this virtual phone",
};
const device = {
  title: "Virtual iPhone",
  subtitle: "Choose the model shown in Moobi",
};

describe("Settings search", () => {
  it("keeps categories visible for an empty or whitespace query", () => {
    expect(matchesSettingsSearch(display, "")).toBe(true);
    expect(matchesSettingsSearch(security, "   ")).toBe(true);
  });
  it("finds titles and descriptions regardless of case or surrounding spaces", () => {
    expect(matchesSettingsSearch(display, "  BRIGHTNESS ")).toBe(true);
    expect(matchesSettingsSearch(security, "pin")).toBe(true);
    expect(matchesSettingsSearch(device, "model")).toBe(true);
  });
  it("matches all terms across the category title and description", () => {
    expect(matchesSettingsSearch(display, "display   appearance")).toBe(true);
    expect(matchesSettingsSearch(security, "pin brightness")).toBe(false);
  });
  it("returns no match for unrelated settings", () => {
    expect(matchesSettingsSearch(display, "camera")).toBe(false);
  });
});
