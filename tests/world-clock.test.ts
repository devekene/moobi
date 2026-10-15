import { describe, expect, it } from "vitest";
import {
  addClockCity,
  getClockCityCatalog,
  getClockCityKey,
  getClockCityName,
  getWorldClockDisplay,
  groupClockCities,
} from "@/lib/world-clock";

describe("live World Clock times", () => {
  const now = new Date("2026-10-15T03:16:00Z");
  it.each([
    ["Africa/Lagos", "04:16", "Today, +0HRS"],
    ["Australia/Sydney", "14:16", "Today, +10HRS"],
    ["America/Toronto", "23:16", "Yesterday, −5HRS"],
    ["Asia/Kolkata", "08:46", "Today, +4:30HRS"],
    ["Asia/Kathmandu", "09:01", "Today, +4:45HRS"],
  ])("formats %s against local time", (zone, time, comparison) => {
    expect(getWorldClockDisplay(zone, now, "Africa/Lagos")).toEqual({
      time,
      comparison,
    });
  });
  it("applies time-zone DST rules rather than a cached offset", () => {
    expect(
      getWorldClockDisplay(
        "Australia/Sydney",
        new Date("2026-06-15T03:16:00Z"),
        "Africa/Lagos",
      ),
    ).toEqual({ time: "13:16", comparison: "Today, +9HRS" });
    expect(
      getWorldClockDisplay(
        "America/Toronto",
        new Date("2026-01-15T03:16:00Z"),
        "Africa/Lagos",
      ),
    ).toEqual({ time: "22:16", comparison: "Yesterday, −6HRS" });
  });
  it("handles midnight, year rollover, and crossing the date line", () => {
    expect(
      getWorldClockDisplay(
        "Etc/UTC",
        new Date("2026-10-15T00:00:00Z"),
        "Etc/UTC",
      ),
    ).toEqual({ time: "00:00", comparison: "Today, +0HRS" });
    expect(
      getWorldClockDisplay(
        "Pacific/Auckland",
        new Date("2026-12-31T23:30:00Z"),
        "Etc/UTC",
      ),
    ).toEqual({ time: "12:30", comparison: "Tomorrow, +13HRS" });
    expect(
      getWorldClockDisplay(
        "Pacific/Kiritimati",
        new Date("2026-10-15T10:30:00Z"),
        "Pacific/Pago_Pago",
      ),
    ).toEqual({ time: "00:30", comparison: "In 2 days, +25HRS" });
  });
  it("advances with the current instant and gracefully rejects invalid zones", () => {
    expect(
      getWorldClockDisplay(
        "Africa/Lagos",
        new Date("2026-10-15T03:17:00Z"),
        "Africa/Lagos",
      )?.time,
    ).toBe("04:17");
    expect(
      getWorldClockDisplay("Invalid/City", now, "Africa/Lagos"),
    ).toBeNull();
  });
});

describe("city catalog and selection", () => {
  const cities = getClockCityCatalog();
  it("provides unique supported cities with searchable country labels", () => {
    expect(cities.length).toBeGreaterThan(400);
    expect(new Set(cities.map(getClockCityKey)).size).toBe(cities.length);
    expect(
      cities.some((city) => city.city === "Lagos" && city.countryCode === "NG"),
    ).toBe(true);
    expect(
      cities.some(
        (city) => city.city === "Abu Dhabi" && city.timezone === "Asia/Dubai",
      ),
    ).toBe(true);
    expect(
      groupClockCities(cities, "united arab emirates")
        .flatMap((group) => group.cities)
        .some((city) => city.city === "Abu Dhabi"),
    ).toBe(true);
    expect(
      groupClockCities(cities, "Cote d'Ivoire")
        .flatMap((group) => group.cities)
        .some((city) => city.city === "Abidjan"),
    ).toBe(true);
    expect(groupClockCities(cities, "no-such-city-123")).toEqual([]);
  });
  it("groups results alphabetically and matches cities and countries without case sensitivity", () => {
    expect(
      groupClockCities(cities, "Lagos")
        .flatMap((group) => group.cities)
        .map((city) => city.city),
    ).toEqual(["Lagos"]);
    const groups = groupClockCities(cities, "  nIGeriA  ");
    expect(
      groups.flatMap((group) => group.cities).map((city) => city.city),
    ).toEqual(["Abuja", "Lagos"]);
    expect(groups.map((group) => group.letter)).toEqual(["A", "L"]);
  });
  it("prevents duplicates while allowing distinct cities that share a time zone", () => {
    const dubai = { city: "Dubai", countryCode: "AE", timezone: "Asia/Dubai" };
    const abuDhabi = {
      city: "Abu Dhabi",
      countryCode: "AE",
      timezone: "Asia/Dubai",
    };
    const initial = [dubai];
    expect(addClockCity(initial, dubai)).toHaveLength(1);
    expect(addClockCity(initial, abuDhabi)).toEqual([dubai, abuDhabi]);
    expect(initial).toHaveLength(1);
    expect(
      addClockCity(
        [{ timezone: "Africa/Lagos", localTime: "stale", utcOffset: "GMT+1" }],
        { city: "Lagos", timezone: "Africa/Lagos", countryCode: "NG" },
      ),
    ).toHaveLength(1);
    expect(
      getClockCityName({ timezone: "America/Argentina/Buenos_Aires" }),
    ).toBe("Buenos Aires");
  });
});
