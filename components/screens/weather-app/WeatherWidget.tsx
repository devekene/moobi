"use client";

import {
  LuDroplets,
  LuLoader,
  LuMapPin,
  LuTriangleAlert,
  LuWind,
} from "react-icons/lu";
import { getTemperature, getWeatherBackground } from "@/lib/utils";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { useWeatherStore } from "@/stores/useWeatherStore";

interface WeatherWidgetProps {
  size?: "small" | "medium" | "large";
  isCelsius?: boolean;
}

export default function WeatherWidget({
  size = "small",
  isCelsius = true,
}: WeatherWidgetProps) {
  const { isLoading, weatherData, error } = useWeatherStore();
  const { setCurrentScreen } = usePhoneStore();

  const formatTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleClick = () => {
    setCurrentScreen("weather");
  };

  if (isLoading) {
    return (
      <div
        className={`${size === "small" ? "h-full w-full rounded-[18px] p-2" : size === "medium" ? "h-40 w-80 rounded-3xl p-4" : "h-80 w-80 rounded-3xl p-4"} flex-center bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg`}
      >
        <div className="text-center text-white">
          <LuLoader className="mx-auto mb-2 h-8 w-8 animate-spin" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div
        className={`${size === "small" ? "h-full w-full rounded-[18px] border border-[var(--phone-border)] bg-[var(--phone-surface-elevated)]/90 p-2" : size === "medium" ? "col-span-3 row-span-2 rounded-3xl bg-gradient-to-br from-red-400 to-red-600 p-4" : "col-span-3 row-span-4 rounded-3xl bg-gradient-to-br from-red-400 to-red-600 p-4"} flex items-center justify-center shadow-lg`}
      >
        <div
          className={
            size === "small"
              ? "text-center text-[var(--phone-text-secondary)]"
              : "text-center text-white"
          }
        >
          <div className="mb-2 text-2xl">
            {size === "small" ? (
              <LuTriangleAlert className="mx-auto h-6 w-6 text-amber-400" />
            ) : (
              "⚠️"
            )}
          </div>
          <p className="text-xs">Weather Unavailable</p>
        </div>
      </div>
    );
  }

  // Small Widget
  if (size === "small") {
    return (
      <div
        className="relative flex h-full w-full cursor-pointer flex-col justify-between overflow-hidden rounded-[18px] p-2 shadow-lg"
        style={{
          background: getWeatherBackground(weatherData.current.condition.text),
        }}
        onClick={handleClick}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 right-2 h-16 w-16 rounded-full bg-white"></div>
          <div className="absolute bottom-4 left-2 h-8 w-8 rounded-full bg-white"></div>
        </div>

        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-1">
            <LuMapPin className="h-3 w-3 text-white/80" />
            <span className="truncate text-xs font-medium text-white/90">
              {weatherData.location.name}
            </span>
          </div>

          <div className="text-center">
            <div className="mb-1 text-3xl font-light text-white">
              {getTemperature(
                isCelsius,
                weatherData.current.temp_c,
                weatherData.current.temp_f,
              )}
            </div>
            <div className="text-xs text-white/80">
              {weatherData.current.condition.text}
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex justify-between text-xs text-white/70">
            <span>
              H:
              {getTemperature(
                isCelsius,
                weatherData.forecast.forecastday[0].day.maxtemp_c,
                weatherData.forecast.forecastday[0].day.maxtemp_f,
              )}
            </span>
            <span>
              L:
              {getTemperature(
                isCelsius,
                weatherData.forecast.forecastday[0].day.mintemp_c,
                weatherData.forecast.forecastday[0].day.mintemp_f,
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Medium Widget
  if (size === "medium") {
    return (
      <div
        className="relative col-span-3 row-span-2 flex justify-between overflow-hidden rounded-3xl p-4 shadow-lg"
        style={{
          background: getWeatherBackground(weatherData.current.condition.text),
        }}
        onClick={handleClick}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-white"></div>
          <div className="absolute bottom-6 left-6 h-12 w-12 rounded-full bg-white"></div>
        </div>

        <div className="relative z-10 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <LuMapPin className="h-4 w-4 text-white/80" />
            <span className="text-sm font-medium text-white/90">
              {weatherData.location.name}
            </span>
          </div>

          <div className="mb-4">
            <div className="mb-1 text-4xl font-light text-white">
              {getTemperature(
                isCelsius,
                weatherData.current.temp_c,
                weatherData.current.temp_f,
              )}
            </div>
            <div className="text-sm text-white/80">
              {weatherData.current.condition.text}
            </div>
          </div>

          <div className="flex gap-4 text-xs text-white/70">
            <div className="flex items-center gap-1">
              <LuDroplets className="h-3 w-3" />
              <span>{weatherData.current.humidity}%</span>
            </div>
            <div className="flex items-center gap-1">
              <LuWind className="h-3 w-3" />
              <span>{Math.round(weatherData.current.wind_mph)}mph</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-end justify-between">
          <div className="text-xs text-white/60">{formatTime()}</div>

          <div className="text-right">
            <img
              src={`https:${weatherData.current.condition.icon}`}
              alt={weatherData.current.condition.text}
              className="mb-2 h-12 w-12"
            />
            <div className="text-xs text-white/70">
              H:
              {getTemperature(
                isCelsius,
                weatherData.forecast.forecastday[0].day.maxtemp_c,
                weatherData.forecast.forecastday[0].day.maxtemp_f,
              )}{" "}
              L:
              {getTemperature(
                isCelsius,
                weatherData.forecast.forecastday[0].day.mintemp_c,
                weatherData.forecast.forecastday[0].day.mintemp_f,
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Large Widget
  return (
    <div
      className="relative col-span-3 flex flex-col overflow-hidden rounded-3xl p-6 shadow-lg"
      style={{
        background: getWeatherBackground(weatherData.current.condition.text),
      }}
      onClick={handleClick}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-6 right-6 h-24 w-24 rounded-full bg-white"></div>
        <div className="absolute bottom-12 left-8 h-16 w-16 rounded-full bg-white"></div>
        <div className="absolute top-1/2 left-4 h-8 w-8 rounded-full bg-white"></div>
      </div>

      <div className="relative z-10 flex-1">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LuMapPin className="h-4 w-4 text-white/80" />
            <span className="text-base font-medium text-white/90">
              {weatherData.location.name}
            </span>
          </div>
          <div className="text-sm text-white/60">{formatTime()}</div>
        </div>

        {/* Current Weather */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-6xl font-light text-white">
            {getTemperature(
              isCelsius,
              weatherData.current.temp_c,
              weatherData.current.temp_f,
            )}
          </div>
          <div className="mb-2 text-lg text-white/90">
            {weatherData.current.condition.text}
          </div>
          <div className="text-sm text-white/70">
            Feels like{" "}
            {getTemperature(
              isCelsius,
              weatherData.current.feelslike_c,
              weatherData.current.feelslike_f,
            )}
          </div>
        </div>

        {/* Today's High/Low */}
        <div className="mb-6 flex justify-center gap-6">
          <div className="text-center">
            <div className="mb-1 text-xs text-white/60">HIGH</div>
            <div className="text-lg font-medium text-white">
              {getTemperature(
                isCelsius,
                weatherData.forecast.forecastday[0].day.maxtemp_c,
                weatherData.forecast.forecastday[0].day.maxtemp_f,
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-xs text-white/60">LOW</div>
            <div className="text-lg font-medium text-white">
              {getTemperature(
                isCelsius,
                weatherData.forecast.forecastday[0].day.mintemp_c,
                weatherData.forecast.forecastday[0].day.mintemp_f,
              )}
            </div>
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-2">
              <LuWind className="h-4 w-4 text-white/80" />
              <span className="text-xs text-white/80">WIND</span>
            </div>
            <div className="text-lg font-medium text-white">
              {Math.round(weatherData.current.wind_mph)} mph
            </div>
          </div>

          <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-2">
              <LuDroplets className="h-4 w-4 text-white/80" />
              <span className="text-xs text-white/80">HUMIDITY</span>
            </div>
            <div className="text-lg font-medium text-white">
              {weatherData.current.humidity}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
