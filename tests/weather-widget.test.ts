import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeatherWidgetCard } from "@/components/screens/weather-app/WeatherWidget";
import { weatherWidgetCity, weatherWidgetLocation } from "@/lib/weather-widget";
import type { SavedWeatherLocation } from "@/lib/weather-locations";

const awka: SavedWeatherLocation = {
  id: "6.2100,7.0700",
  name: "Awka",
  region: "Anambra",
  country: "Nigeria",
  latitude: 6.21,
  longitude: 7.07,
  timezone: "Africa/Lagos",
  isCurrent: false,
  temperature: 25,
  high: 32,
  low: 25,
  condition: { text: "Overcast", code: 3, is_day: true },
  updatedAt: 1,
};
function render(
  location: SavedWeatherLocation | null,
  celsius = true,
  refreshFailed = false,
) {
  return renderToStaticMarkup(
    createElement(WeatherWidgetCard, {
      location,
      celsius,
      refreshFailed,
      onOpen: () => {},
    }),
  );
}

describe("Home weather widget", () => {
  it("prefers the saved current location and otherwise uses the first saved city", () => {
    const current = {
      ...awka,
      id: "current",
      isCurrent: true,
      name: "Current Location",
    };
    expect(weatherWidgetLocation([awka, current])).toBe(current);
    expect(weatherWidgetLocation([awka])).toBe(awka);
    expect(weatherWidgetLocation([])).toBeNull();
  });
  it("uses a readable current-location label when reverse geocoding is unavailable", () => {
    expect(
      weatherWidgetCity({ ...awka, isCurrent: true, name: "6.21, 7.07" }),
    ).toBe("My Location");
    expect(weatherWidgetCity({ ...awka, isCurrent: true })).toBe("Awka");
  });
  it("renders a named, keyboard-accessible button with the city, condition and range", () => {
    const html = render(awka);
    expect(html).toContain('type="button"');
    expect(html).toContain(
      'aria-label="Open Weather for Awka, 25°C, Cloudy. High 32°, low 25°."',
    );
    expect(html).toContain("H:32° L:25°");
    expect(html).not.toContain("Overcast</span>");
  });
  it("continues displaying a saved summary after refresh failure", () => {
    const html = render(awka, true, true);
    expect(html).toContain("Showing saved weather");
    expect(html).toContain("H:32° L:25°");
    expect(html).not.toContain("Weather Unavailable");
  });
  it("converts the current, high and low temperatures to Fahrenheit together", () => {
    const html = render(awka, false);
    expect(html).toContain("77°F");
    expect(html).toContain("H:90° L:77°");
  });
  it("keeps the empty state actionable instead of showing a dead error tile", () => {
    const html = render(null);
    expect(html).toContain('aria-label="Open Weather to add a city"');
    expect(html).toContain("Add a city");
    expect(html).not.toContain("disabled");
  });
});
