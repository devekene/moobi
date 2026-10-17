import type { WeatherData } from "@/types";

export function upcomingWeatherHours(data: WeatherData) {
  // Local hour boundaries also work for half-hour and quarter-hour time zones.
  const hours = data.forecast.forecastday.flatMap((day) => day.hour);
  const current = hours.findLastIndex(
    (hour) => hour.time_epoch <= data.current.time_epoch,
  );
  return hours.slice(Math.max(0, current), Math.max(0, current) + 24);
}

export function temperatureRange(
  low: number,
  high: number,
  minimum: number,
  maximum: number,
) {
  const span = Math.max(1, maximum - minimum);
  return {
    left: `${Math.max(0, ((low - minimum) / span) * 100)}%`,
    width: `${Math.max(3, ((high - low) / span) * 100)}%`,
  };
}

export function moonPhaseName(phase: number) {
  if (phase < 0.03 || phase > 0.97) return "New moon";
  if (phase < 0.22) return "Waxing crescent";
  if (phase < 0.28) return "First quarter";
  if (phase < 0.47) return "Waxing gibbous";
  if (phase < 0.53) return "Full moon";
  if (phase < 0.72) return "Waning gibbous";
  if (phase < 0.78) return "Last quarter";
  return "Waning crescent";
}
