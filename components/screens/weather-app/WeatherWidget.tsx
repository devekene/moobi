"use client";

import { useEffect } from "react";
import { IoNavigate } from "react-icons/io5";
import { LuCloud } from "react-icons/lu";
import type { SavedWeatherLocation } from "@/lib/weather-locations";
import { weatherWidgetCity, weatherWidgetLocation } from "@/lib/weather-widget";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { useWeatherLocationsStore } from "@/stores/useWeatherLocationsStore";
import { useWeatherStore } from "@/stores/useWeatherStore";
import WeatherIcon from "./WeatherIcon";
import styles from "./WeatherWidget.module.css";

interface WeatherWidgetProps {
  size?: "small" | "medium" | "large";
  isCelsius?: boolean;
}
interface WeatherWidgetCardProps {
  location: SavedWeatherLocation | null;
  celsius: boolean;
  onOpen: () => void;
  size?: WeatherWidgetProps["size"];
  refreshFailed?: boolean;
}

export function WeatherWidgetCard({
  location,
  celsius,
  onOpen,
  size = "small",
  refreshFailed = false,
}: WeatherWidgetCardProps) {
  const temp = (value: number) =>
    `${Math.round(celsius ? value : (value * 9) / 5 + 32)}°`;
  const city = location ? weatherWidgetCity(location) : "Weather";
  const condition =
    location?.condition.code === 3 ? "Cloudy" : location?.condition.text;
  const label = location
    ? `Open Weather for ${city}, ${temp(location.temperature)}${celsius ? "C" : "F"}, ${condition}. High ${temp(location.high)}, low ${temp(location.low)}.${refreshFailed ? " Showing saved weather; update unavailable." : ""}`
    : "Open Weather to add a city";
  return (
    <div className={styles.widget} data-size={size}>
      <button
        type="button"
        className={styles.card}
        onClick={onOpen}
        aria-label={label}
        data-sky={
          location && location.condition.code <= 1
            ? location.condition.is_day
              ? "clear"
              : "night"
            : "cloudy"
        }
        title={
          refreshFailed
            ? "Showing saved weather. Open Weather to retry updating."
            : undefined
        }
      >
        {location ? (
          <>
            <span className={styles.top}>
              <span className={styles.city}>
                <span>{city}</span>
                {location.isCurrent && <IoNavigate aria-hidden="true" />}
              </span>
              <span className={styles.temperature}>
                {temp(location.temperature)}
              </span>
            </span>
            <span className={styles.bottom}>
              <WeatherIcon
                condition={location.condition}
                className={styles.icon}
              />
              <span className={styles.condition}>{condition}</span>
              <span className={styles.range}>
                H:{temp(location.high)} L:{temp(location.low)}
              </span>
            </span>
          </>
        ) : (
          <span className={styles.empty}>
            <LuCloud aria-hidden="true" />
            <strong>Weather</strong>
            <span>Add a city</span>
          </span>
        )}
      </button>
      <span className={styles.caption} aria-hidden="true">
        Weather
      </span>
    </div>
  );
}

export default function WeatherWidget({
  size = "small",
  isCelsius,
}: WeatherWidgetProps) {
  const locations = useWeatherLocationsStore((state) => state.locations);
  const savedCelsius = useWeatherLocationsStore((state) => state.celsius);
  const location = weatherWidgetLocation(locations);
  const locationError = useWeatherStore((state) =>
    location ? state.locationErrors[location.id] : undefined,
  );
  const refreshLocations = useWeatherStore((state) => state.refreshLocations);
  const locationId = location?.id;
  useEffect(() => {
    if (!locationId) return;
    const refresh = () => {
      if (document.visibilityState !== "hidden")
        void refreshLocations(false, [locationId]);
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [locationId, refreshLocations]);

  const open = () => {
    const weather = useWeatherStore.getState();
    if (location) void weather.openLocation(location.id);
    else weather.showLocations();
    usePhoneStore.getState().setCurrentScreen("weather");
  };
  return (
    <WeatherWidgetCard
      location={location}
      celsius={isCelsius ?? savedCelsius}
      onOpen={open}
      size={size}
      refreshFailed={Boolean(locationError)}
    />
  );
}
