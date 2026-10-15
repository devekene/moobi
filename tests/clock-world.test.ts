import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Timezone } from "@/types";
import WorldClock from "@/components/screens/clock/WorldClock";

let selectedTimezones: Timezone[];
vi.mock("@/context/ClockContext", () => ({
  useClock: () => ({ selectedTimezones, setSelectedTimezones: () => {} }),
}));

describe("World Clock screen", () => {
  beforeEach(() => {
    selectedTimezones = [];
  });
  it("offers a city-sheet entry point and an empty state without rendering the analog clock", () => {
    const markup = renderToStaticMarkup(createElement(WorldClock));
    expect(markup).toContain("World Clock");
    expect(markup).toContain('aria-label="Add city"');
    expect(markup).toContain("Add a city to see its local time.");
    expect(markup).not.toContain("Local time");
  });
  it("shows named city rows without making the entire row a delete target", () => {
    selectedTimezones = [
      { timezone: "Africa/Lagos", city: "Lagos", countryCode: "NG" },
      { timezone: "Australia/Sydney", city: "Sydney", countryCode: "AU" },
    ];
    const markup = renderToStaticMarkup(createElement(WorldClock));
    expect(markup).toContain('aria-label="Lagos time"');
    expect(markup).toContain('aria-label="Sydney time"');
    expect(markup).toContain('aria-label="Edit world clocks"');
    expect(markup).not.toContain('aria-label="Remove Lagos clock"');
    expect(markup).not.toContain("No clocks here");
  });
});
