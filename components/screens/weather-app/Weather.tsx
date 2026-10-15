"use client";

import { useEffect, useState } from "react";
import {
  LuCloudRain,
  LuDroplets,
  LuEye,
  LuLoader,
  LuMapPin,
  LuRefreshCw,
  LuSearch,
  LuThermometer,
  LuWind,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useWeatherStore, usePhoneStore } from "@/stores";
import { getTemperature, getWeatherBackground } from "@/lib/utils";

const Weather = () => {
  const { fetchWeather, error, isLoading, weatherData } = useWeatherStore();
  const { setCurrentScreen } = usePhoneStore();

  const [searchLocation, setSearchLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCelsius, setIsCelsius] = useState(true);
  const [selectedView, setSelectedView] = useState<"hourly" | "daily">(
    "hourly",
  );

  const handleSearch = async () => {
    if (!searchLocation.trim()) return;

    setIsSearching(true);
    await fetchWeather(searchLocation);
    setSearchLocation("");
    setIsSearching(false);
  };

  const handleRefresh = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(`${latitude},${longitude}`);
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Fallback if user denies location
          fetchWeather("New York");
        },
      );
    } else {
      // If geolocation is not supported
      fetchWeather("New York");
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
  };

  if (isLoading && !weatherData) {
    return (
      <div className="flex-center h-full w-full bg-gradient-to-br from-blue-400 via-blue-300 to-blue-400 p-4">
        <LuLoader className="spin-custom mx-auto mb-4 h-12 w-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center h-full w-full bg-red-500 p-4">
        <div className="px-8 text-center text-white">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="mb-2 text-xl font-bold">Weather Error</h2>
          <p className="mb-4 text-sm">{error}</p>
          <Button
            onClick={handleRefresh}
            className="bg-white text-red-500 hover:bg-gray-100"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    // redirect to home
    setCurrentScreen("home");
    return null;
  }

  const currentHour = new Date().getHours();
  const todayHours =
    weatherData.forecast.forecastday[0]?.hour.filter((hour) => {
      const hourTime = new Date(hour.time).getHours();
      return hourTime >= currentHour;
    }) || [];

  const tomorrowHours =
    weatherData.forecast.forecastday[1]?.hour.slice(
      0,
      24 - todayHours.length,
    ) || [];
  const next24Hours = [...todayHours, ...tomorrowHours].slice(0, 24);

  return (
    <div
      className="mt-10 flex flex-1 flex-col px-4 py-4"
      style={{
        background: getWeatherBackground(weatherData.current.condition.text),
      }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LuMapPin className="h-5 w-5 text-white" />
          <span className="text-lg font-medium text-white">
            {weatherData.location.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCelsius(!isCelsius)}
            className="h-8 border-0 bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30"
          >
            {isCelsius ? "°C" : "°F"}
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8 border-0 bg-white/20 p-2 text-white hover:bg-white/30"
          >
            <LuRefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex gap-1">
          <div className="relative flex-1 rounded-lg bg-gray-500/50 py-2">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-white/60" />
            <input
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search location..."
              className="bg-transparent pl-10 text-white placeholder:text-white/60 focus:outline-none"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchLocation.trim()}
            className="border-0 bg-white/20 px-4 text-white hover:bg-white/30"
          >
            {isSearching ? <LuLoader className="h-4 w-4 animate-spin" /> : "Go"}
          </Button>
        </div>
      </div>

      {/* Current Weather */}
      <div className="mb-8 text-center">
        <div className="mb-2 text-7xl font-thin text-white">
          {getTemperature(
            isCelsius,
            weatherData.current.temp_c,
            weatherData.current.temp_f,
          )}
        </div>
        <div className="mb-2 text-base text-white/90">
          {weatherData.current.condition.text}
        </div>
        <div className="text-base text-white/80">
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

      {/* View Toggle */}
      <div className="mb-4 flex rounded-xl bg-white/20 p-1">
        <Button
          onClick={() => setSelectedView("hourly")}
          className={`flex-1 rounded-lg border-0 py-2 text-sm font-medium ${
            selectedView === "hourly"
              ? "bg-white/30 text-white"
              : "bg-transparent text-white/70 hover:bg-white/10"
          }`}
        >
          Hourly
        </Button>
        <Button
          onClick={() => setSelectedView("daily")}
          className={`flex-1 rounded-lg border-0 py-2 text-sm font-medium ${
            selectedView === "daily"
              ? "bg-white/30 text-white"
              : "bg-transparent text-white/70 hover:bg-white/10"
          }`}
        >
          7-Day
        </Button>
      </div>

      {/* Hourly/Daily Forecast */}
      <div className="flex-1 rounded-2xl bg-white/20 p-4 backdrop-blur-xl">
        {selectedView === "hourly" ? (
          <div className="space-y-3">
            <h3 className="mb-3 text-sm font-medium text-white">
              Next 24 Hours
            </h3>
            <div className="no-visible-scrollbar max-h-48 space-y-2 overflow-y-auto">
              {next24Hours.map((hour, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-sm text-white/80">
                      {index === 0 ? "Now" : formatTime(hour.time)}
                    </span>
                    <img
                      src={`https:${hour.condition.icon}`}
                      alt={hour.condition.text}
                      className="h-6 w-6"
                    />
                    <span className="flex-1 text-xs text-white/70">
                      {hour.condition.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {hour.chance_of_rain > 0 && (
                      <div className="flex items-center gap-1">
                        <LuCloudRain className="h-3 w-3 text-blue-300" />
                        <span className="text-xs text-blue-300">
                          {hour.chance_of_rain}%
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-white">
                      {getTemperature(isCelsius, hour.temp_c, hour.temp_f)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="mb-3 text-sm font-medium text-white">
              7-Day Forecast
            </h3>
            <div className="no-visible-scrollbar space-y-2">
              {weatherData.forecast.forecastday.map((day, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-sm text-white/80">
                      {formatDate(day.date)}
                    </span>
                    <img
                      src={`https:${day.day.condition.icon}`}
                      alt={day.day.condition.text}
                      className="h-6 w-6"
                    />
                    <span className="flex-1 text-xs text-white/70">
                      {day.day.condition.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {day.day.daily_chance_of_rain > 0 && (
                      <div className="flex items-center gap-1">
                        <LuCloudRain className="h-3 w-3 text-blue-300" />
                        <span className="text-xs text-blue-300">
                          {day.day.daily_chance_of_rain}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/60">
                        {getTemperature(
                          isCelsius,
                          day.day.mintemp_c,
                          day.day.mintemp_f,
                        )}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {getTemperature(
                          isCelsius,
                          day.day.maxtemp_c,
                          day.day.maxtemp_f,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Weather Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/20 p-3 backdrop-blur-xl">
          <div className="mb-1 flex items-center gap-2">
            <LuWind className="h-4 w-4 text-white/80" />
            <span className="text-xs text-white/80">WIND</span>
          </div>
          <div className="text-lg font-medium text-white">
            {Math.round(weatherData.current.wind_mph)} mph
          </div>
          <div className="text-xs text-white/60">
            {weatherData.current.wind_dir}
          </div>
        </div>

        <div className="rounded-xl bg-white/20 p-3 backdrop-blur-xl">
          <div className="mb-1 flex items-center gap-2">
            <LuDroplets className="h-4 w-4 text-white/80" />
            <span className="text-xs text-white/80">HUMIDITY</span>
          </div>
          <div className="text-lg font-medium text-white">
            {weatherData.current.humidity}%
          </div>
        </div>

        <div className="rounded-xl bg-white/20 p-3 backdrop-blur-xl">
          <div className="mb-1 flex items-center gap-2">
            <LuEye className="h-4 w-4 text-white/80" />
            <span className="text-xs text-white/80">VISIBILITY</span>
          </div>
          <div className="text-lg font-medium text-white">
            {Math.round(weatherData.current.vis_miles)} mi
          </div>
        </div>

        <div className="rounded-xl bg-white/20 p-3 backdrop-blur-xl">
          <div className="mb-1 flex items-center gap-2">
            <LuThermometer className="h-4 w-4 text-white/80" />
            <span className="text-xs text-white/80">FEELS LIKE</span>
          </div>
          <div className="text-lg font-medium text-white">
            {getTemperature(
              isCelsius,
              weatherData.current.feelslike_c,
              weatherData.current.feelslike_f,
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Weather;
