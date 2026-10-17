import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { encryptedStorage } from "@/lib/encrypted-storage";
import {
  MAX_WEATHER_LOCATIONS,
  restoreWeatherLocations,
  weatherLocationKey,
  weatherLocationSummary,
  type SavedWeatherLocation,
} from "@/lib/weather-locations";
import type { WeatherData } from "@/types";

interface WeatherLocationsState {
  locations: SavedWeatherLocation[];
  celsius: boolean;
  saveLocation: (data: WeatherData, isCurrent?: boolean) => string | null;
  updateForecast: (data: WeatherData) => void;
  removeLocation: (id: string) => void;
  moveLocation: (id: string, direction: -1 | 1) => void;
  setCelsius: (celsius: boolean) => void;
}
export const createWeatherLocationsStore = (storage: StateStorage) =>
  create<WeatherLocationsState>()(
    persist(
      (set, get) => ({
        locations: [],
        celsius: true,
        saveLocation: (data, isCurrent = false) => {
          const summary = weatherLocationSummary(data, isCurrent);
          const key = weatherLocationKey(summary.latitude, summary.longitude);
          const existing = get().locations.find(
            (item) =>
              item.id === summary.id ||
              weatherLocationKey(item.latitude, item.longitude) === key,
          );
          if (!existing && get().locations.length >= MAX_WEATHER_LOCATIONS)
            return null;
          const next =
            existing && !isCurrent
              ? {
                  ...summary,
                  id: existing.id,
                  isCurrent: existing.isCurrent,
                  name: existing.name,
                }
              : summary;
          set((state) => ({
            locations: isCurrent
              ? [
                  next,
                  ...state.locations.filter(
                    (item) =>
                      item.id !== "current" &&
                      weatherLocationKey(item.latitude, item.longitude) !== key,
                  ),
                ]
              : existing
                ? state.locations.map((item) =>
                    item.id === existing.id ? next : item,
                  )
                : [...state.locations, next],
          }));
          return next.id;
        },
        updateForecast: (data) => {
          const summary = weatherLocationSummary(data);
          const key = weatherLocationKey(summary.latitude, summary.longitude);
          if (
            !get().locations.some(
              (item) =>
                weatherLocationKey(item.latitude, item.longitude) === key,
            )
          )
            return;
          set((state) => ({
            locations: state.locations.map((item) =>
              weatherLocationKey(item.latitude, item.longitude) === key
                ? {
                    ...summary,
                    id: item.id,
                    isCurrent: item.isCurrent,
                    name: item.name,
                    region: item.region,
                    country: item.country,
                  }
                : item,
            ),
          }));
        },
        removeLocation: (id) =>
          set((state) => ({
            locations: state.locations.filter((item) => item.id !== id),
          })),
        moveLocation: (id, direction) =>
          set((state) => {
            const locations = [...state.locations];
            const index = locations.findIndex((item) => item.id === id);
            const target = index + direction;
            if (
              index < 0 ||
              !locations[target] ||
              locations[index].isCurrent ||
              locations[target].isCurrent
            )
              return state;
            [locations[index], locations[target]] = [
              locations[target],
              locations[index],
            ];
            return { locations };
          }),
        setCelsius: (celsius) => set({ celsius }),
      }),
      {
        name: "moobi-weather-locations",
        storage: createJSONStorage(() => storage),
        skipHydration: storage === encryptedStorage,
        partialize: ({ locations, celsius }) => ({ locations, celsius }),
        merge: (saved, current) => ({
          ...current,
          locations: restoreWeatherLocations(saved),
          celsius: !(
            saved &&
            typeof saved === "object" &&
            "celsius" in saved &&
            saved.celsius === false
          ),
        }),
      },
    ),
  );
export const useWeatherLocationsStore =
  createWeatherLocationsStore(encryptedStorage);
