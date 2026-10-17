import type { SavedWeatherLocation } from "@/lib/weather-locations";

/** Keep Home stable while searches and other cities load in the Weather app. */
export function weatherWidgetLocation(
  locations: readonly SavedWeatherLocation[],
) {
  return (
    locations.find((location) => location.isCurrent) ?? locations[0] ?? null
  );
}

export function weatherWidgetCity(location: SavedWeatherLocation) {
  return location.isCurrent && /^[-\d.]+,\s*[-\d.]+$/.test(location.name)
    ? "My Location"
    : location.name;
}
