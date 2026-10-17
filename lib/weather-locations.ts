import type { WeatherCondition, WeatherData } from "@/types";

export const MAX_WEATHER_LOCATIONS = 20;
export const WEATHER_FRESHNESS_MS = 10 * 60 * 1000;
export interface SavedWeatherLocation {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isCurrent: boolean;
  temperature: number;
  high: number;
  low: number;
  condition: WeatherCondition;
  updatedAt: number;
}
export const weatherLocationKey = (latitude: number, longitude: number) =>
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
export function weatherLocationSummary(
  data: WeatherData,
  isCurrent = false,
): SavedWeatherLocation {
  const today = data.forecast.forecastday[0];
  return {
    id: isCurrent
      ? "current"
      : weatherLocationKey(data.location.latitude, data.location.longitude),
    ...data.location,
    isCurrent,
    temperature: data.current.temp_c,
    high: today.day.maxtemp_c,
    low: today.day.mintemp_c,
    condition: data.current.condition,
    updatedAt: Date.now(),
  };
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function isSavedWeatherLocation(
  value: unknown,
): value is SavedWeatherLocation {
  if (!record(value) || !record(value.condition)) return false;
  if (
    !["id", "name", "region", "country", "timezone"].every(
      (key) => typeof value[key] === "string",
    )
  )
    return false;
  if (
    !["latitude", "longitude", "temperature", "high", "low", "updatedAt"].every(
      (key) => typeof value[key] === "number" && Number.isFinite(value[key]),
    )
  )
    return false;
  if (
    typeof value.latitude !== "number" ||
    Math.abs(value.latitude) > 90 ||
    typeof value.longitude !== "number" ||
    Math.abs(value.longitude) > 180 ||
    typeof value.isCurrent !== "boolean"
  )
    return false;
  if (
    typeof value.condition.text !== "string" ||
    typeof value.condition.code !== "number" ||
    !Number.isFinite(value.condition.code) ||
    typeof value.condition.is_day !== "boolean"
  )
    return false;
  if (typeof value.timezone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value.timezone });
  } catch {
    return false;
  }
  return (
    value.id ===
    (value.isCurrent
      ? "current"
      : weatherLocationKey(value.latitude, value.longitude))
  );
}
export function restoreWeatherLocations(
  saved: unknown,
): SavedWeatherLocation[] {
  if (!record(saved) || !Array.isArray(saved.locations)) return [];
  const locations: SavedWeatherLocation[] = [];
  const seen = new Set<string>();
  for (const location of saved.locations.filter(isSavedWeatherLocation)) {
    const key = weatherLocationKey(location.latitude, location.longitude);
    if (seen.has(key) || locations.some((item) => item.id === location.id))
      continue;
    seen.add(key);
    locations.push(location);
    if (locations.length === MAX_WEATHER_LOCATIONS) break;
  }
  return locations.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
}
