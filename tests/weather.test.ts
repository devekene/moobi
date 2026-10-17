import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  moonPhaseName,
  temperatureRange,
  upcomingWeatherHours,
} from "@/lib/weather-presentation";
import { GET } from "@/app/api/weather/route";
import { weatherCondition } from "@/lib/weather";
import { useWeatherStore } from "@/stores/useWeatherStore";

const start = Date.parse("2026-10-17T00:00:00+09:00") / 1000;
function forecast() {
  return {
    timezone: "Asia/Tokyo",
    current: {
      time: start + 3600,
      temperature_2m: 20,
      apparent_temperature: 19,
      relative_humidity_2m: 60,
      is_day: 0,
      weather_code: 0,
      pressure_msl: 1012,
      wind_gusts_10m: 22,
      wind_speed_10m: 16.09344,
      wind_direction_10m: 90,
    },
    hourly: {
      time: Array.from({ length: 48 }, (_, i) => start + i * 3600),
      uv_index: Array<number>(48).fill(2),
      dew_point_2m: Array<number>(48).fill(15),
      wind_speed_10m: Array<number>(48).fill(16),
      precipitation: Array<number>(48).fill(0.5),
      temperature_2m: Array<number>(48).fill(20),
      weather_code: Array<number>(48).fill(61),
      is_day: Array<number>(48).fill(1),
      precipitation_probability: Array<number>(48).fill(35),
      visibility: Array<number | null>(48).fill(16093.44),
    },
    daily: {
      sunrise: [start + 21600, start + 108000],
      sunset: [start + 64800, start + 151200],
      moonrise: [null, start + 100000],
      moonset: [start + 30000, null],
      moon_phase: [0.21, 0.24],
      precipitation_sum: [6, 3],
      uv_index_max: [8, 7],
      time: [start, start + 86400],
      temperature_2m_max: [25, 26],
      temperature_2m_min: [15, 16],
      weather_code: [61, 95],
      precipitation_probability_max: [40, 70],
    },
  };
}
const mockFetch = vi.fn<typeof fetch>();
const call = (query = "location=Tokyo&days=7") =>
  GET(new Request(`http://localhost/api/weather?${query}`));

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
  useWeatherStore.setState({
    isLoading: false,
    error: null,
    weatherData: null,
  });
});
afterEach(() => vi.unstubAllGlobals());

function mockCity() {
  mockFetch.mockResolvedValueOnce(
    Response.json({
      results: [
        {
          name: "Tokyo",
          latitude: 35.68,
          longitude: 139.69,
          country: "Japan",
        },
      ],
    }),
  );
  mockFetch.mockResolvedValueOnce(Response.json(forecast()));
}

describe("Open-Meteo route", () => {
  it("geocodes city names, converts units, and groups hours using forecast timezone", async () => {
    mockCity();
    const response = await call();
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.location).toMatchObject({
      name: "Tokyo",
      localtime: "2026-10-17",
      timezone: "Asia/Tokyo",
    });
    expect(data.current).toMatchObject({
      temp_c: 20,
      temp_f: 68,
      feelslike_f: 66.2,
      wind_dir: "E",
      condition: { is_day: false },
    });
    expect(data.current.wind_mph).toBeCloseTo(10);
    expect(data.current).toMatchObject({
      pressure_mb: 1012,
      gust_kph: 22,
      uv: 2,
      dewpoint_c: 15,
    });
    expect(data.forecast.forecastday[0]).toMatchObject({
      moonrise: null,
      moon_phase: 0.21,
      day: { totalprecip_mm: 6, uv: 8 },
    });
    expect(data.current.vis_miles).toBeCloseTo(10);
    expect(data.forecast.forecastday[0].hour).toHaveLength(24);
    expect(data.forecast.forecastday[1].hour).toHaveLength(24);
    expect(data.forecast.forecastday[0].day.daily_chance_of_rain).toBe(40);
    const [geocoding, weather] = mockFetch.mock.calls.map(
      ([url]) => new URL(String(url)),
    );
    expect(geocoding.hostname).toBe("geocoding-api.open-meteo.com");
    expect(geocoding.searchParams.get("name")).toBe("Tokyo");
    expect(weather.hostname).toBe("api.open-meteo.com");
    expect(weather.searchParams.get("forecast_days")).toBe("7");
    expect(weather.searchParams.has("apikey")).toBe(false);
  });

  it("uses coordinates without geocoding and preserves unavailable visibility", async () => {
    const payload = forecast();
    payload.hourly.visibility[1] = null;
    mockFetch.mockResolvedValueOnce(Response.json(payload));
    const response = await call("location=35.68,139.69&days=2");
    const { data } = await response.json();
    expect(data.location.name).toBe("35.68, 139.69");
    expect(data.current.vis_miles).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    "days=0",
    "days=17",
    "days=1.5",
    "days=no",
    "location=",
    "location=91,0",
  ])("rejects invalid input %s", async (query) => {
    expect((await call(query)).status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns a useful error when a city is not found", async () => {
    mockFetch.mockResolvedValueOnce(Response.json({}));
    const response = await call();
    expect(response.status).toBe(404);
    expect((await response.json()).error).toContain("Location not found");
  });

  it("handles upstream errors, timeouts, and incomplete forecasts", async () => {
    for (const failure of [
      Response.json({}, { status: 429 }),
      Response.json({ current: {} }),
    ]) {
      mockFetch.mockResolvedValueOnce(failure);
      expect((await call("location=0,0")).status).toBe(502);
    }
    mockFetch.mockRejectedValueOnce(
      new DOMException("Timed out", "TimeoutError"),
    );
    expect((await call("location=0,0")).status).toBe(502);
    const payload = forecast();
    payload.hourly.temperature_2m = [];
    mockFetch.mockResolvedValueOnce(Response.json(payload));
    expect((await call("location=0,0")).status).toBe(502);
  });

  it("maps WMO conditions, including snow, fog, hail and unknown codes", () => {
    expect(weatherCondition(86, 1).text).toBe("Heavy snow showers");
    expect(weatherCondition(48, 0).text).toContain("fog");
    expect(weatherCondition(99, 1).text).toContain("hail");
    expect(weatherCondition(999, 0)).toMatchObject({
      text: "Unknown conditions",
      is_day: false,
    });
  });
});

describe("weather store", () => {
  it("keeps the previous forecast after a failed search", async () => {
    mockCity();
    const initial = await (await call()).json();
    useWeatherStore.setState({ weatherData: initial.data });
    mockFetch.mockResolvedValueOnce(
      Response.json(
        { success: false, error: "Location not found" },
        { status: 404 },
      ),
    );
    await useWeatherStore.getState().fetchWeather("bad city");
    expect(useWeatherStore.getState()).toMatchObject({
      weatherData: initial.data,
      error: "Location not found",
      isLoading: false,
    });
  });

  it("prevents an older request from replacing a newer result or clearing its loading state", async () => {
    let resolveFirst: (value: Response) => void = () => {};
    mockFetch.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const first = useWeatherStore.getState().fetchWeather("First");
    mockFetch.mockResolvedValueOnce(
      Response.json({ success: false, error: "Newer error" }, { status: 404 }),
    );
    await useWeatherStore.getState().fetchWeather("Second");
    resolveFirst(
      Response.json({ success: false, error: "Old error" }, { status: 404 }),
    );
    await first;
    expect(useWeatherStore.getState()).toMatchObject({
      error: "Newer error",
      isLoading: false,
    });
  });
});

describe("weather presentation", () => {
  it("keeps the current hour and the next 23 hours in chronological order", async () => {
    mockCity();
    const { data } = await (await call()).json();
    const hours = upcomingWeatherHours(data);
    expect(hours).toHaveLength(24);
    expect(hours[0].time_epoch).toBe(start + 3600);
    expect(hours.at(-1)?.time_epoch).toBe(start + 86400);
  });
  it("handles forecasts ending early", async () => {
    mockCity();
    const { data } = await (await call()).json();
    data.current.time_epoch = start + 48 * 3600;
    expect(upcomingWeatherHours(data)).toHaveLength(1);
  });
  it("renders a visible range when temperatures are equal", () => {
    expect(temperatureRange(20, 20, 20, 20)).toEqual({
      left: "0%",
      width: "3%",
    });
    expect(temperatureRange(20, 25, 15, 30)).toEqual({
      left: `${(5 / 15) * 100}%`,
      width: `${(5 / 15) * 100}%`,
    });
  });
  it("names lunar phases across the cycle", () => {
    expect(moonPhaseName(0)).toBe("New moon");
    expect(moonPhaseName(0.21)).toBe("Waxing crescent");
    expect(moonPhaseName(0.5)).toBe("Full moon");
    expect(moonPhaseName(0.8)).toBe("Waning crescent");
  });
});
