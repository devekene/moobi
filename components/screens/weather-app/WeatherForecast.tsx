"use client";

import { useRef, useState } from "react";
import {
  LuCloud,
  LuDroplet,
  LuList,
  LuMap,
  LuNavigation,
  LuRefreshCw,
  LuSunrise,
  LuWind,
} from "react-icons/lu";
import { useWeatherGeolocation } from "@/hooks/useWeatherGeolocation";
import { useWeatherLocationsStore } from "@/stores/useWeatherLocationsStore";
import { useWeatherStore } from "@/stores/useWeatherStore";
import {
  temperatureRange,
  upcomingWeatherHours,
} from "@/lib/weather-presentation";
import WeatherIcon from "./WeatherIcon";
import WeatherDetails from "./WeatherDetails";
import styles from "./Weather.module.css";

type ConditionMode = "temperature" | "rain" | "wind";

export default function WeatherForecast() {
  const {
    fetchWeather,
    error,
    isLoading,
    weatherData: data,
    showLocations,
    openLocation,
    selectedLocationId,
  } = useWeatherStore();
  const { celsius, setCelsius } = useWeatherLocationsStore();
  const { locate, locating, locationError } = useWeatherGeolocation();
  const [mode, setMode] = useState<ConditionMode>("temperature");
  const [collapsed, setCollapsed] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const refresh = () => {
    if (data)
      void fetchWeather(
        currentLocation
          ? `${data.location.latitude},${data.location.longitude}`
          : data.location.name,
      );
  };
  const temp = (c: number) => `${Math.round(celsius ? c : (c * 9) / 5 + 32)}°`;
  const time = (epoch: number, minutes = false) =>
    new Date(epoch * 1000).toLocaleTimeString("en-GB", {
      timeZone: data?.location.timezone,
      hour: "2-digit",
      ...(minutes ? { minute: "2-digit" } : {}),
    });
  const today = data?.forecast.forecastday[0];
  const hours = data ? upcomingWeatherHours(data) : [];
  const days = data?.forecast.forecastday ?? [];
  const minimum = Math.min(...days.map((day) => day.day.mintemp_c));
  const maximum = Math.max(...days.map((day) => day.day.maxtemp_c));
  const maxRainfall = Math.max(1, ...hours.map((hour) => hour.precip_mm));
  const cloudy = data && data.current.condition.code >= 2;
  const condition =
    data?.current.condition.code === 3
      ? "Cloudy"
      : data?.current.condition.text;
  const currentLocation =
    selectedLocationId === "current" ||
    (data && /^[-\d.]+, [-\d.]+$/.test(data.location.name));
  const locationName = currentLocation
    ? "Current Location"
    : data?.location.name;

  return (
    <div
      className={styles.weather}
      data-sky={
        cloudy ? "cloudy" : data?.current.condition.is_day ? "clear" : "night"
      }
    >
      <div className={styles.sky} aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
      <div
        ref={scrollRef}
        className={styles.scroller}
        onScroll={(e) => {
          const next = e.currentTarget.scrollTop > 125;
          if (next !== collapsed) setCollapsed(next);
        }}
      >
        {data && today ? (
          <>
            <header className={styles.hero}>
              <p>{currentLocation ? "MY LOCATION" : "WEATHER"}</p>
              <h1>{locationName}</h1>
              <div className={styles.temperature}>
                {temp(data.current.temp_c)}
              </div>
              <strong>{condition}</strong>
              <span>
                H:{temp(today.day.maxtemp_c)} L:{temp(today.day.mintemp_c)}
              </span>
            </header>
            <main className={styles.content}>
              {(error || locationError) && (
                <p className={styles.notice} role="alert">
                  {error || locationError}
                </p>
              )}
              <section
                className={`${styles.card} ${styles.conditions}`}
                aria-label="Hourly conditions"
              >
                <div className={styles.conditionsHead}>
                  <div>
                    <h2>Conditions</h2>
                    <p>
                      {mode === "temperature"
                        ? `Temperature (${celsius ? "°C" : "°F"})`
                        : mode === "rain"
                          ? "Precipitation (%)"
                          : "Wind (km/h)"}
                    </p>
                  </div>
                  <div className={styles.segments} aria-label="Conditions view">
                    {(
                      [
                        {
                          id: "temperature",
                          Icon: LuCloud,
                          label: "Temperature",
                        },
                        { id: "rain", Icon: LuDroplet, label: "Precipitation" },
                        { id: "wind", Icon: LuWind, label: "Wind" },
                      ] as const
                    ).map(({ id, Icon, label }) => (
                      <button
                        key={id}
                        aria-label={label}
                        aria-pressed={mode === id}
                        onClick={() => setMode(id)}
                      >
                        <Icon />
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.hours}>
                  {hours.flatMap((hour, index) => {
                    const previous =
                      hours[index - 1]?.time_epoch ?? hour.time_epoch;
                    const sunrise =
                      mode === "temperature" &&
                      today.sunrise > previous &&
                      today.sunrise <= hour.time_epoch;
                    return [
                      ...(sunrise
                        ? [
                            <div className={styles.hour} key="sunrise">
                              <b>{time(today.sunrise, true)}</b>
                              <LuSunrise className={styles.sunriseIcon} />
                              <b>Sunrise</b>
                            </div>,
                          ]
                        : []),
                      <div className={styles.hour} key={hour.time_epoch}>
                        <b>{index === 0 ? "Now" : time(hour.time_epoch)}</b>
                        <WeatherIcon
                          condition={hour.condition}
                          className={styles.conditionIcon}
                        />
                        <b>
                          {mode === "temperature"
                            ? temp(hour.temp_c)
                            : mode === "rain"
                              ? `${hour.chance_of_rain}%`
                              : Math.round(hour.wind_kph)}
                        </b>
                      </div>,
                    ];
                  })}
                </div>
              </section>
              <section
                className={`${styles.card} ${styles.daily}`}
                aria-label="Seven-day forecast"
              >
                {days.map((day, index) => (
                  <div className={styles.day} key={day.date}>
                    <b>
                      {index === 0
                        ? "Today"
                        : new Date(`${day.date}T12:00:00Z`).toLocaleDateString(
                            "en-GB",
                            { weekday: "short", timeZone: "UTC" },
                          )}
                    </b>
                    <div className={styles.dayCondition}>
                      <WeatherIcon condition={day.day.condition} />
                      {day.day.daily_chance_of_rain > 0 && (
                        <small>{day.day.daily_chance_of_rain}%</small>
                      )}
                    </div>
                    <span className={styles.low}>
                      {temp(day.day.mintemp_c)}
                    </span>
                    <div className={styles.range}>
                      <i
                        style={temperatureRange(
                          day.day.mintemp_c,
                          day.day.maxtemp_c,
                          minimum,
                          maximum,
                        )}
                      />
                      {index === 0 && (
                        <span
                          style={{
                            left: `${Math.max(0, Math.min(100, ((data.current.temp_c - minimum) / Math.max(1, maximum - minimum)) * 100))}%`,
                          }}
                        />
                      )}
                    </div>
                    <b className={styles.high}>{temp(day.day.maxtemp_c)}</b>
                  </div>
                ))}
              </section>
              <section
                ref={mapRef}
                className={`${styles.card} ${styles.precipitation}`}
              >
                <h2 className={styles.label}>
                  <LuDroplet /> PRECIPITATION
                </h2>
                {mapOpen ? (
                  <>
                    <iframe
                      loading="lazy"
                      title="Map of the forecast location"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.location.longitude - 2},${data.location.latitude - 2},${data.location.longitude + 2},${data.location.latitude + 2}&layer=mapnik&marker=${data.location.latitude},${data.location.longitude}`}
                    />
                    <p>Location map · Radar layer unavailable</p>
                  </>
                ) : (
                  <>
                    <div className={styles.rainSummary}>
                      <strong>
                        {today.day.totalprecip_mm}
                        <small> mm</small>
                      </strong>
                      <span>Today at {locationName}</span>
                    </div>
                    <div
                      className={styles.rainChart}
                      aria-label="Hourly precipitation in millimetres"
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour.time_epoch}
                          title={`${time(hour.time_epoch)}: ${hour.precip_mm} mm`}
                        >
                          <i
                            style={{
                              height: `${Math.max(3, Math.min(100, (hour.precip_mm / maxRainfall) * 100))}%`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className={styles.chartLabels}>
                      <span>Now</span>
                      <span>Next 24 hours</span>
                    </div>
                    <button
                      className={styles.textButton}
                      onClick={() => setMapOpen(true)}
                    >
                      View location map <LuMap />
                    </button>
                  </>
                )}
              </section>
              <WeatherDetails data={data} celsius={celsius} />
              <div className={styles.attribution}>
                <button onClick={() => setCelsius(!celsius)}>
                  {celsius ? "°C" : "°F"} · Change units
                </button>
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Weather data by Open-Meteo
                </a>
                <p>Updated {time(data.current.time_epoch, true)}</p>
              </div>
            </main>
          </>
        ) : (
          <div className={styles.empty} role="status">
            <LuCloud />
            <h1>{isLoading ? "Loading weather" : "Weather"}</h1>
            {error ? (
              <>
                <p role="alert">{error}</p>
                <button
                  onClick={() => {
                    if (selectedLocationId)
                      void openLocation(selectedLocationId);
                  }}
                >
                  Try again
                </button>
                <button onClick={showLocations}>Search a city</button>
              </>
            ) : (
              <p>Getting the latest forecast…</p>
            )}
          </div>
        )}
      </div>
      {data && (
        <div
          className={styles.compact}
          data-visible={collapsed}
          aria-hidden={!collapsed}
        >
          <small>{currentLocation ? "MY LOCATION" : "WEATHER"}</small>
          <strong>{locationName}</strong>
          <span>
            {temp(data.current.temp_c)} | {condition}
          </span>
        </div>
      )}
      <nav className={styles.toolbar} aria-label="Weather controls">
        <button
          disabled={!data}
          aria-label="View precipitation"
          onClick={() =>
            mapRef.current?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
              block: "start",
            })
          }
        >
          <LuMap />
        </button>
        <div className={styles.locationPill}>
          <button
            aria-label="Use current location"
            onClick={locate}
            disabled={locating || isLoading}
          >
            <LuNavigation />
          </button>
          <i />
          <button
            aria-label="Refresh forecast"
            onClick={refresh}
            disabled={isLoading || !data}
          >
            <LuRefreshCw className={isLoading ? styles.spinning : undefined} />
          </button>
        </div>
        <button aria-label="Show weather locations" onClick={showLocations}>
          <LuList />
        </button>
      </nav>
    </div>
  );
}
