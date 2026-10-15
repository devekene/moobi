import type { Timezone } from "@/types";
import { WORLD_TIME_ZONES } from "@/lib/world-clock-zones";

export type ClockCity = { city: string; countryCode: string; timezone: string };
export type CityGroup = { letter: string; cities: ClockCity[] };
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const shortCountryNames: Record<string, string> = {
  AE: "UAE",
  US: "USA",
  GB: "UK",
};
const extraCities: readonly ClockCity[] = [
  { city: "Abu Dhabi", countryCode: "AE", timezone: "Asia/Dubai" },
  { city: "Abuja", countryCode: "NG", timezone: "Africa/Lagos" },
  { city: "Acapulco", countryCode: "MX", timezone: "America/Mexico_City" },
  { city: "Acton", countryCode: "US", timezone: "America/New_York" },
  { city: "Adamstown", countryCode: "PN", timezone: "Pacific/Pitcairn" },
  {
    city: "Aguascalientes",
    countryCode: "MX",
    timezone: "America/Mexico_City",
  },
  { city: "Albuquerque", countryCode: "US", timezone: "America/Denver" },
  { city: "Alexandria", countryCode: "EG", timezone: "Africa/Cairo" },
  { city: "Beijing", countryCode: "CN", timezone: "Asia/Shanghai" },
  { city: "Delhi", countryCode: "IN", timezone: "Asia/Kolkata" },
  { city: "Mumbai", countryCode: "IN", timezone: "Asia/Kolkata" },
  { city: "San Francisco", countryCode: "US", timezone: "America/Los_Angeles" },
  { city: "Washington, D.C.", countryCode: "US", timezone: "America/New_York" },
];

export const getClockCityName = (
  zone: Pick<Timezone, "timezone" | "city">,
): string =>
  zone.city ||
  zone.timezone.split("/").at(-1)?.replaceAll("_", " ") ||
  zone.timezone;
export const getClockCityKey = (
  zone: Pick<Timezone, "timezone" | "city">,
): string => `${zone.timezone}:${getClockCityName(zone)}`;

export const getClockCountryName = (code: string): string => {
  return shortCountryNames[code] ?? regionNames.of(code) ?? code;
};
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .toLowerCase();

export const getClockCityCatalog = (): ClockCity[] => {
  const cities: ClockCity[] = WORLD_TIME_ZONES.map(
    ([countryCode, timezone]) => ({
      city: getClockCityName({ timezone }),
      countryCode,
      timezone,
    }),
  );
  // Named cities may share an IANA zone; each remains independently selectable.
  const unique = new Map(
    [...cities, ...extraCities].map((city) => [getClockCityKey(city), city]),
  );
  return [...unique.values()]
    .filter((city) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: city.timezone });
        return true;
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        a.city.localeCompare(b.city, "en") ||
        a.countryCode.localeCompare(b.countryCode),
    );
};

export const groupClockCities = (
  cities: readonly ClockCity[],
  query: string,
): CityGroup[] => {
  const search = normalize(query.trim());
  const groups = new Map<string, ClockCity[]>();
  for (const city of cities) {
    if (
      search &&
      !normalize(
        `${city.city} ${getClockCountryName(city.countryCode)} ${regionNames.of(city.countryCode)}`,
      ).includes(search)
    )
      continue;
    const initial = normalize(city.city).charAt(0).toUpperCase();
    const letter = /^[A-Z]$/.test(initial) ? initial : "#";
    const group = groups.get(letter) ?? [];
    group.push(city);
    groups.set(letter, group);
  }
  return [...groups].map(([letter, cities]) => ({ letter, cities }));
};

export const addClockCity = (
  selected: readonly Timezone[],
  city: ClockCity,
): Timezone[] =>
  selected.some((item) => getClockCityKey(item) === getClockCityKey(city))
    ? [...selected]
    : [...selected, city];

const zonedParts = (now: Date, timezone: string) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const year = value("year"),
    month = value("month"),
    day = value("day"),
    hour = value("hour"),
    minute = value("minute");
  return {
    date: Date.UTC(year, month - 1, day),
    wallTime: Date.UTC(year, month - 1, day, hour, minute),
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
};

export const getWorldClockDisplay = (
  timezone: string,
  now: Date,
  localTimezone: string,
): { time: string; comparison: string } | null => {
  try {
    const remote = zonedParts(now, timezone),
      local = zonedParts(now, localTimezone);
    const days = Math.round((remote.date - local.date) / 86400000);
    const day =
      days === 0
        ? "Today"
        : days === -1
          ? "Yesterday"
          : days === 1
            ? "Tomorrow"
            : days < 0
              ? `${-days} days ago`
              : `In ${days} days`;
    const offset = Math.round((remote.wallTime - local.wallTime) / 60000);
    const absolute = Math.abs(offset),
      hours = Math.floor(absolute / 60),
      minutes = absolute % 60;
    return {
      time: remote.time,
      comparison: `${day}, ${offset < 0 ? "−" : "+"}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}HRS`,
    };
  } catch {
    return null;
  }
};
