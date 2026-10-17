import type { WeatherCondition, WeatherData } from "@/types";

export class WeatherError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function object(value: unknown): Record<string, unknown> {
  if (!isObject(value)) {
    throw new WeatherError("Weather provider returned invalid data", 502);
  }
  return value;
}

function numeric(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new WeatherError("Weather provider returned incomplete data", 502);
  }
  return value;
}

function series(
  data: Record<string, unknown>,
  key: string,
  length: number,
): number[] {
  const values = data[key];
  if (!Array.isArray(values) || values.length !== length) {
    throw new WeatherError("Weather provider returned incomplete data", 502);
  }
  return values.map(numeric);
}

function times(data: Record<string, unknown>): number[] {
  const values = data.time;
  if (!Array.isArray(values) || values.length === 0) {
    throw new WeatherError("Weather provider returned no forecast", 502);
  }
  return values.map(numeric);
}

const conditions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Light snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with light hail",
  99: "Thunderstorm with heavy hail",
};

export function weatherCondition(
  code: number,
  isDay: number,
): WeatherCondition {
  return {
    code,
    text: conditions[code] ?? "Unknown conditions",
    is_day: isDay === 1,
  };
}

const fahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;

async function requestJson(url: URL, revalidate: number): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new WeatherError(
      "Weather service is temporarily unavailable. Please try again.",
      502,
    );
  }
  return response.json();
}

export async function fetchOpenMeteoWeather(
  location: string,
  days: number,
): Promise<WeatherData> {
  let latitude: number;
  let longitude: number;
  let name: string;
  let region = "";
  let country = "";
  const coordinates = location.match(
    /^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/,
  );
  if (coordinates) {
    latitude = Number(coordinates[1]);
    longitude = Number(coordinates[2]);
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new WeatherError(
        "Please enter valid latitude and longitude coordinates",
        400,
      );
    }
    // Open-Meteo does not offer reverse geocoding; do not invent a city name.
    name = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  } else {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: location,
      count: "1",
      language: "en",
      format: "json",
    }).toString();
    const geocoding = object(await requestJson(url, 86400));
    if (!Array.isArray(geocoding.results) || geocoding.results.length === 0) {
      throw new WeatherError(
        "Location not found. Try a city name or latitude,longitude.",
        404,
      );
    }
    const place = object(geocoding.results[0]);
    latitude = numeric(place.latitude);
    longitude = numeric(place.longitude);
    if (typeof place.name !== "string")
      throw new WeatherError("Invalid location response", 502);
    name = place.name;
    region = typeof place.admin1 === "string" ? place.admin1 : "";
    country = typeof place.country === "string" ? place.country : "";
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl",
    hourly:
      "temperature_2m,weather_code,is_day,precipitation_probability,visibility,uv_index,dew_point_2m,wind_speed_10m,precipitation",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset,moonrise,moonset,moon_phase",
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: String(days),
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
  }).toString();
  const data = object(await requestJson(url, 600));
  if (typeof data.timezone !== "string")
    throw new WeatherError("Missing forecast timezone", 502);
  const timezone = data.timezone;
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateKey = (epoch: number) =>
    dateFormatter.format(new Date(epoch * 1000));
  const current = object(data.current);
  const hourly = object(data.hourly);
  const daily = object(data.daily);
  const hourTimes = times(hourly);
  const dayTimes = times(daily);
  const temperatures = series(hourly, "temperature_2m", hourTimes.length);
  const codes = series(hourly, "weather_code", hourTimes.length);
  const daylight = series(hourly, "is_day", hourTimes.length);
  const rain = series(hourly, "precipitation_probability", hourTimes.length);
  const uv = series(hourly, "uv_index", hourTimes.length);
  const dewpoint = series(hourly, "dew_point_2m", hourTimes.length);
  const hourlyWind = series(hourly, "wind_speed_10m", hourTimes.length);
  const hourlyPrecip = series(hourly, "precipitation", hourTimes.length);
  const sunrise = series(daily, "sunrise", dayTimes.length);
  const sunset = series(daily, "sunset", dayTimes.length);
  const moonPhase = series(daily, "moon_phase", dayTimes.length);
  const dailyPrecip = series(daily, "precipitation_sum", dayTimes.length);
  const dailyUv = series(daily, "uv_index_max", dayTimes.length);
  const nullableSeries = (key: string): (number | null)[] => {
    const values = daily[key];
    if (!Array.isArray(values) || values.length !== dayTimes.length)
      throw new WeatherError("Missing lunar forecast", 502);
    return values.map((value: unknown) =>
      value === null ? null : numeric(value),
    );
  };
  const moonrise = nullableSeries("moonrise");
  const moonset = nullableSeries("moonset");
  const visibility = hourly.visibility;
  if (!Array.isArray(visibility) || visibility.length !== hourTimes.length) {
    throw new WeatherError("Missing forecast visibility", 502);
  }
  const max = series(daily, "temperature_2m_max", dayTimes.length);
  const min = series(daily, "temperature_2m_min", dayTimes.length);
  const dailyCodes = series(daily, "weather_code", dayTimes.length);
  const dailyRain = series(
    daily,
    "precipitation_probability_max",
    dayTimes.length,
  );
  const currentTime = numeric(current.time);
  const temp = numeric(current.temperature_2m);
  const feelsLike = numeric(current.apparent_temperature);
  const wind = numeric(current.wind_speed_10m);
  const direction = numeric(current.wind_direction_10m);
  const closestHour = hourTimes.reduce(
    (best, time, index) =>
      Math.abs(time - currentTime) < Math.abs(hourTimes[best] - currentTime)
        ? index
        : best,
    0,
  );
  const visibilityMeters = visibility[closestHour];
  const hours = hourTimes.map((time, index) => ({
    wind_kph: hourlyWind[index],
    precip_mm: hourlyPrecip[index],
    time_epoch: time,
    time: new Date(time * 1000).toISOString(),
    temp_c: temperatures[index],
    temp_f: fahrenheit(temperatures[index]),
    condition: weatherCondition(codes[index], daylight[index]),
    chance_of_rain: rain[index],
  }));
  return {
    location: {
      name,
      region,
      country,
      timezone,
      localtime: dateKey(currentTime),
      latitude,
      longitude,
    },
    current: {
      pressure_mb: numeric(current.pressure_msl),
      wind_kph: wind,
      wind_degree: direction,
      gust_kph: numeric(current.wind_gusts_10m),
      uv: uv[closestHour],
      dewpoint_c: dewpoint[closestHour],
      time_epoch: currentTime,
      temp_c: temp,
      temp_f: fahrenheit(temp),
      condition: weatherCondition(
        numeric(current.weather_code),
        numeric(current.is_day),
      ),
      humidity: numeric(current.relative_humidity_2m),
      wind_mph: wind / 1.609344,
      wind_dir: [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
      ][Math.round(direction / 22.5) % 16],
      feelslike_c: feelsLike,
      feelslike_f: fahrenheit(feelsLike),
      vis_miles:
        visibilityMeters === null ? null : numeric(visibilityMeters) / 1609.344,
    },
    forecast: {
      forecastday: dayTimes.map((time, index) => {
        const date = dateKey(time);
        return {
          date,
          sunrise: sunrise[index],
          sunset: sunset[index],
          moonrise: moonrise[index],
          moonset: moonset[index],
          moon_phase: moonPhase[index],
          day: {
            maxtemp_c: max[index],
            maxtemp_f: fahrenheit(max[index]),
            mintemp_c: min[index],
            mintemp_f: fahrenheit(min[index]),
            condition: weatherCondition(dailyCodes[index], 1),
            daily_chance_of_rain: dailyRain[index],
            totalprecip_mm: dailyPrecip[index],
            uv: dailyUv[index],
          },
          hour: hours.filter((hour) => dateKey(hour.time_epoch) === date),
        };
      }),
    },
  };
}
