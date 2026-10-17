import type { WeatherData } from "@/types";
import { create } from "zustand";
import { useWeatherLocationsStore } from "@/stores/useWeatherLocationsStore";
import {
  MAX_WEATHER_LOCATIONS,
  WEATHER_FRESHNESS_MS,
  weatherLocationKey,
} from "@/lib/weather-locations";

interface WeatherType {
  isLoading: boolean;
  error: string | null;
  weatherData: WeatherData | null;
  view: "list" | "detail";
  selectedLocationId: string | null;
  refreshingLocations: boolean;
  locationErrors: Record<string, string>;
  forecasts: Record<string, WeatherData>;
  fetchWeather: (loc: string) => Promise<WeatherData | null>;
  openLocation: (id: string) => Promise<void>;
  showLocations: () => void;
  refreshLocations: (
    force?: boolean,
    locationIds?: readonly string[],
  ) => Promise<void>;
}
type WeatherResponse =
  { success: true; data: WeatherData } | { success: false; error: string };
async function requestWeather(loc: string): Promise<WeatherData> {
  const response = await fetch(
    `/api/weather?location=${encodeURIComponent(loc)}&days=7`,
  );
  const data: WeatherResponse = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.success ? "Failed to fetch weather data" : data.error);
  return data.data;
}
function cacheForecast(
  forecasts: Record<string, WeatherData>,
  key: string,
  data: WeatherData,
) {
  return Object.fromEntries(
    [
      ...Object.entries(forecasts).filter(([id]) => id !== key),
      [key, data],
    ].slice(-MAX_WEATHER_LOCATIONS),
  );
}
export const createWeatherStore = (locations = useWeatherLocationsStore) => {
  let latestRequest = 0;
  return create<WeatherType>((set, get) => ({
    isLoading: false,
    error: null,
    weatherData: null,
    view: "list",
    selectedLocationId: null,
    forecasts: {},
    refreshingLocations: false,
    locationErrors: {},
    fetchWeather: async (loc) => {
      const request = ++latestRequest;
      set({ isLoading: true, error: null });
      try {
        const result = await requestWeather(loc);
        if (request !== latestRequest) return null;
        const key = weatherLocationKey(
          result.location.latitude,
          result.location.longitude,
        );
        const saved = locations
          .getState()
          .locations.find(
            (item) => weatherLocationKey(item.latitude, item.longitude) === key,
          );
        const data = saved
          ? {
              ...result,
              location: {
                ...result.location,
                name: saved.name,
                region: saved.region,
                country: saved.country,
              },
            }
          : result;
        locations.getState().updateForecast(data);
        set((state) => ({
          weatherData: data,
          forecasts: cacheForecast(state.forecasts, key, data),
          locationErrors: saved
            ? { ...state.locationErrors, [saved.id]: "" }
            : state.locationErrors,
        }));
        return data;
      } catch (error) {
        if (request === latestRequest)
          set({
            error:
              error instanceof Error
                ? error.message
                : "Network error. Please try again.",
          });
        return null;
      } finally {
        if (request === latestRequest) set({ isLoading: false });
      }
    },
    openLocation: async (id) => {
      ++latestRequest;
      const saved = locations
        .getState()
        .locations.find((item) => item.id === id);
      if (!saved) return;
      const key = weatherLocationKey(saved.latitude, saved.longitude);
      const cached = get().forecasts[key];
      set({
        view: "detail",
        selectedLocationId: id,
        isLoading: false,
        weatherData: cached ?? null,
        error: null,
      });
      if (cached && Date.now() - saved.updatedAt < WEATHER_FRESHNESS_MS) return;
      await get().fetchWeather(`${saved.latitude},${saved.longitude}`);
    },
    showLocations: () => {
      ++latestRequest;
      set({ view: "list", isLoading: false, error: null });
    },
    refreshLocations: async (force = false, locationIds) => {
      if (get().refreshingLocations) return;
      const queue = locations
        .getState()
        .locations.filter(
          (item) =>
            (!locationIds || locationIds.includes(item.id)) &&
            (force || Date.now() - item.updatedAt >= WEATHER_FRESHNESS_MS),
        );
      if (!queue.length) return;
      set({ refreshingLocations: true });
      const worker = async () => {
        for (let saved = queue.shift(); saved; saved = queue.shift()) {
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "hidden"
          )
            break;
          try {
            const result = await requestWeather(
              `${saved.latitude},${saved.longitude}`,
            );
            // A removed card must not be resurrected by an in-flight refresh.
            if (
              !locations
                .getState()
                .locations.some(
                  (item) =>
                    item.id === saved.id &&
                    weatherLocationKey(item.latitude, item.longitude) ===
                      weatherLocationKey(saved.latitude, saved.longitude),
                )
            )
              continue;
            const data = {
              ...result,
              location: {
                ...result.location,
                name: saved.name,
                region: saved.region,
                country: saved.country,
              },
            };
            locations.getState().updateForecast(data);
            const key = weatherLocationKey(saved.latitude, saved.longitude);
            set((state) => ({
              forecasts: cacheForecast(state.forecasts, key, data),
              locationErrors: { ...state.locationErrors, [saved.id]: "" },
            }));
          } catch {
            set((state) => ({
              locationErrors: {
                ...state.locationErrors,
                [saved.id]: "Couldn’t update · Showing saved weather",
              },
            }));
          }
        }
      };
      try {
        await Promise.all([worker(), worker()]);
      } finally {
        set({ refreshingLocations: false });
      }
    },
  }));
};
export const useWeatherStore = createWeatherStore();
