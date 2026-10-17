import { afterEach, describe, expect, it, vi } from "vitest";
import type { StateStorage } from "zustand/middleware";
import type { WeatherData } from "@/types";
import { createWeatherLocationsStore } from "@/stores/useWeatherLocationsStore";
import { createWeatherStore } from "@/stores/useWeatherStore";
import { createCipher, createEncryptedStorage } from "@/lib/encrypted-storage";
import {
  restoreWeatherLocations,
  weatherLocationSummary,
} from "@/lib/weather-locations";

function data(name = "Awka", latitude = 6.21, longitude = 7.07): WeatherData {
  return {
    location: {
      name,
      latitude,
      longitude,
      region: "Anambra",
      country: "Nigeria",
      timezone: "Africa/Lagos",
      localtime: "2026-10-17",
    },
    current: {
      time_epoch: 1792214100,
      temp_c: 25,
      temp_f: 77,
      condition: { text: "Overcast", code: 3, is_day: true },
      wind_mph: 3,
      wind_dir: "SW",
      humidity: 94,
      feelslike_c: 27,
      feelslike_f: 80.6,
      vis_miles: 9,
      pressure_mb: 1012,
      wind_kph: 5,
      wind_degree: 220,
      gust_kph: 9,
      uv: 0,
      dewpoint_c: 24,
    },
    forecast: {
      forecastday: [
        {
          date: "2026-10-17",
          sunrise: 1792214280,
          sunset: 1792257360,
          moonrise: null,
          moonset: null,
          moon_phase: 0.21,
          day: {
            maxtemp_c: 31,
            maxtemp_f: 87.8,
            mintemp_c: 25,
            mintemp_f: 77,
            daily_chance_of_rain: 70,
            totalprecip_mm: 6,
            uv: 8,
            condition: { text: "Rain", code: 61, is_day: true },
          },
          hour: [],
        },
      ],
    },
  };
}
function setup() {
  const values = new Map<string, string>();
  const storage: StateStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  };
  const locations = createWeatherLocationsStore(storage);
  return { values, storage, locations, weather: createWeatherStore(locations) };
}
const ok = (payload: WeatherData) =>
  Response.json({ success: true, data: payload });
afterEach(() => vi.unstubAllGlobals());

describe("saved Weather locations", () => {
  it("deduplicates coordinates, keeps list order, and preserves city names on coordinate refreshes", () => {
    const { locations } = setup();
    const first = locations.getState().saveLocation(data());
    locations.getState().saveLocation(data("Lagos", 6.45, 3.39));
    expect(
      locations.getState().saveLocation(data("Awka", 6.21001, 7.07001)),
    ).toBe(first);
    locations.getState().updateForecast(data("6.21, 7.07"));
    expect(locations.getState().locations.map((item) => item.name)).toEqual([
      "Awka",
      "Lagos",
    ]);
  });
  it("pins one current location and replaces its coordinates without duplicating a saved city", () => {
    const { locations } = setup();
    locations.getState().saveLocation(data());
    locations.getState().saveLocation(data("Lagos", 6.45, 3.39));
    expect(locations.getState().saveLocation(data(), true)).toBe("current");
    locations.getState().saveLocation(data("Abuja", 9.07, 7.4), true);
    expect(locations.getState().locations.map((item) => item.name)).toEqual([
      "Abuja",
      "Lagos",
    ]);
    expect(
      locations.getState().locations.filter((item) => item.isCurrent),
    ).toHaveLength(1);
  });
  it("persists ordering, removals, units, and compact summaries across hydration", () => {
    const { locations, storage, values } = setup();
    const a = locations.getState().saveLocation(data())!;
    const b = locations.getState().saveLocation(data("Lagos", 6.45, 3.39))!;
    locations.getState().moveLocation(b, -1);
    locations.getState().setCelsius(false);
    const restored = createWeatherLocationsStore(storage);
    expect(restored.getState().locations.map((item) => item.id)).toEqual([
      b,
      a,
    ]);
    expect(restored.getState().celsius).toBe(false);
    expect(values.get("moobi-weather-locations")).not.toContain("forecastday");
    restored.getState().removeLocation(a);
    expect(
      createWeatherLocationsStore(storage)
        .getState()
        .locations.map((item) => item.id),
    ).toEqual([b]);
  });
  it("keeps the current location pinned during keyboard reordering", () => {
    const { locations } = setup();
    locations.getState().saveLocation(data(), true);
    const id = locations.getState().saveLocation(data("Lagos", 6.45, 3.39))!;
    locations.getState().moveLocation(id, -1);
    locations.getState().moveLocation("current", 1);
    expect(locations.getState().locations[0].isCurrent).toBe(true);
  });
  it("bounds the saved list while still allowing existing locations to update", () => {
    const { locations } = setup();
    for (let index = 0; index < 20; index++)
      locations.getState().saveLocation(data(`City ${index}`, index, 2));
    expect(locations.getState().saveLocation(data("Extra", 30, 2))).toBeNull();
    expect(locations.getState().saveLocation(data("City 0", 0, 2))).toBe(
      "0.0000,2.0000",
    );
    expect(locations.getState().locations).toHaveLength(20);
  });
  it("validates restored records and removes duplicates and invalid timezones", () => {
    const valid = weatherLocationSummary(data());
    expect(
      restoreWeatherLocations({
        locations: [
          valid,
          valid,
          { ...valid, timezone: "bad/timezone" },
          { ...valid, latitude: Infinity },
          null,
        ],
      }),
    ).toEqual([valid]);
  });
  it("stores and restores location summaries through authenticated encryption", async () => {
    const { storage, values } = setup();
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const encrypted = createEncryptedStorage(
      storage,
      createCipher(async () => key),
      vi.fn(),
    );
    const locations = createWeatherLocationsStore(encrypted);
    await locations.persist.rehydrate();
    locations.getState().saveLocation(data());
    await encrypted.getItem("moobi-weather-locations");
    expect(values.get("moobi-weather-locations")).toMatch(
      /^moobi:encrypted:v1:/,
    );
    expect(values.get("moobi-weather-locations")).not.toContain("Awka");
    const restored = createWeatherLocationsStore(encrypted);
    await restored.persist.rehydrate();
    expect(restored.getState().locations[0].name).toBe("Awka");
  });
});

describe("list and forecast navigation", () => {
  it("opens cached cards without another request and returns to the list", async () => {
    const { locations, weather } = setup();
    const fetcher = vi.fn().mockResolvedValue(ok(data()));
    vi.stubGlobal("fetch", fetcher);
    const result = await weather.getState().fetchWeather("Awka");
    const id = locations.getState().saveLocation(result!)!;
    await weather.getState().openLocation(id);
    expect(weather.getState()).toMatchObject({
      view: "detail",
      selectedLocationId: id,
      weatherData: data(),
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    weather.getState().showLocations();
    expect(weather.getState().view).toBe("list");
    expect(locations.getState().locations).toHaveLength(1);
  });
  it("does not show another city’s forecast while a restored card loads", async () => {
    const { locations, weather } = setup();
    weather.setState({ weatherData: data("Lagos", 6.45, 3.39) });
    const id = locations.getState().saveLocation(data())!;
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const request = weather.getState().openLocation(id);
    expect(weather.getState().weatherData).toBeNull();
    resolve(ok(data()));
    await request;
    expect(weather.getState().weatherData?.location.name).toBe("Awka");
  });
  it("prevents a pending card request from overwriting a later cached selection", async () => {
    const { locations, weather } = setup();
    const first = locations.getState().saveLocation(data())!;
    const lagos = data("Lagos", 6.45, 3.39);
    const second = locations.getState().saveLocation(lagos)!;
    weather.setState({ forecasts: { [second]: lagos } });
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const pending = weather.getState().openLocation(first);
    await weather.getState().openLocation(second);
    resolve(ok(data()));
    await pending;
    expect(weather.getState().weatherData?.location.name).toBe("Lagos");
    expect(weather.getState().isLoading).toBe(false);
  });
  it("preserves saved cards after refresh failure and retries independently of the active forecast", async () => {
    const { locations, weather } = setup();
    const id = locations.getState().saveLocation(data())!;
    weather.setState({ weatherData: data("Other", 1, 2) });
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(ok(data()));
    vi.stubGlobal("fetch", fetcher);
    await weather.getState().refreshLocations(true);
    expect(locations.getState().locations[0].temperature).toBe(25);
    expect(weather.getState().locationErrors[id]).toContain(
      "Showing saved weather",
    );
    expect(weather.getState().weatherData?.location.name).toBe("Other");
    await weather.getState().refreshLocations(true);
    expect(weather.getState().locationErrors[id]).toBe("");
    expect(weather.getState().refreshingLocations).toBe(false);
  });
  it("does not resurrect a card removed during a refresh", async () => {
    const { locations, weather } = setup();
    const id = locations.getState().saveLocation(data())!;
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const pending = weather.getState().refreshLocations(true);
    locations.getState().removeLocation(id);
    resolve(ok(data()));
    await pending;
    expect(locations.getState().locations).toEqual([]);
  });
  it("limits list refreshes to two concurrent requests and coalesces duplicate refreshes", async () => {
    const { locations, weather } = setup();
    for (let index = 0; index < 4; index++)
      locations.getState().saveLocation(data(`City ${index}`, index, 2));
    const completions: (() => void)[] = [];
    let active = 0;
    let peak = 0;
    const fetcher = vi.fn(
      (url: string) =>
        new Promise<Response>((resolve) => {
          active++;
          peak = Math.max(peak, active);
          const [latitude, longitude] = new URL(
            url,
            "http://localhost",
          ).searchParams
            .get("location")!
            .split(",")
            .map(Number);
          completions.push(() => {
            active--;
            resolve(ok(data("Updated", latitude, longitude)));
          });
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const pending = weather.getState().refreshLocations(true);
    await weather.getState().refreshLocations(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    completions.shift()?.();
    completions.shift()?.();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
    completions.shift()?.();
    completions.shift()?.();
    await pending;
    expect(peak).toBe(2);
    expect(weather.getState().refreshingLocations).toBe(false);
  });
  it("refreshes only the Home widget’s location when an explicit selection is supplied", async () => {
    const { locations, weather } = setup();
    const id = locations.getState().saveLocation(data())!;
    locations.getState().saveLocation(data("Lagos", 6.45, 3.39));
    const fetcher = vi.fn().mockResolvedValue(ok(data()));
    vi.stubGlobal("fetch", fetcher);
    await weather.getState().refreshLocations(true, [id]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain("location=6.21%2C7.07");
    expect(weather.getState().weatherData).toBeNull();
  });
  it("skips fresh summaries and pauses refresh requests while the document is hidden", async () => {
    const { locations, weather } = setup();
    locations.getState().saveLocation(data());
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await weather.getState().refreshLocations();
    vi.stubGlobal("document", { visibilityState: "hidden" });
    await weather.getState().refreshLocations(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
