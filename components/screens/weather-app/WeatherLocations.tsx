"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuArrowDown,
  LuArrowUp,
  LuCheck,
  LuCloud,
  LuEllipsis,
  LuLocateFixed,
  LuMinus,
  LuPlus,
  LuRefreshCw,
  LuSearch,
} from "react-icons/lu";
import {
  MAX_WEATHER_LOCATIONS,
  type SavedWeatherLocation,
} from "@/lib/weather-locations";
import { useWeatherLocationsStore } from "@/stores/useWeatherLocationsStore";
import { useWeatherGeolocation } from "@/hooks/useWeatherGeolocation";
import { useWeatherStore } from "@/stores/useWeatherStore";
import styles from "./WeatherLocations.module.css";

function localTime(location: SavedWeatherLocation) {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: location.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
}
const conditionText = (location: SavedWeatherLocation) =>
  location.condition.code === 3 ? "Cloudy" : location.condition.text;

export default function WeatherLocations() {
  const {
    locations,
    celsius,
    setCelsius,
    saveLocation,
    removeLocation,
    moveLocation,
  } = useWeatherLocationsStore();
  const {
    fetchWeather,
    isLoading,
    openLocation,
    refreshLocations,
    refreshingLocations,
    locationErrors,
  } = useWeatherStore();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const {
    locate: requestLocation,
    locating,
    locationError,
  } = useWeatherGeolocation();
  const [, updateClock] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const menuRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const temp = (value: number) =>
    `${Math.round(celsius ? value : (value * 9) / 5 + 32)}°`;

  useEffect(() => {
    active.current = true;
    const selected = useWeatherStore.getState().selectedLocationId;
    if (selected)
      listRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-weather-location="${selected}"]`,
        )
        ?.focus({ preventScroll: true });
    const refresh = () => {
      if (document.visibilityState !== "hidden") {
        updateClock((value) => value + 1);
        void refreshLocations();
      }
    };
    refresh();
    const clock = window.setInterval(() => {
      if (document.visibilityState !== "hidden")
        updateClock((value) => value + 1);
    }, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active.current = false;
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshLocations]);

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };
  const add = async (location: string, isCurrent = false) => {
    setError("");
    const result = await fetchWeather(location);
    if (!active.current) return;
    if (!result) {
      setError(
        useWeatherStore.getState().error ??
          "Unable to add this location. Please try again.",
      );
      return;
    }
    const id = saveLocation(result, isCurrent);
    if (!id) {
      setError(
        `You can save up to ${MAX_WEATHER_LOCATIONS} locations. Remove one to add another.`,
      );
      return;
    }
    setQuery("");
    await openLocation(id);
  };
  const locate = () => {
    closeMenu();
    setError("");
    requestLocation();
  };
  const busy = isLoading || locating;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1>Weather</h1>
        <details
          ref={menuRef}
          className={styles.options}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeMenu();
              menuRef.current?.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label="Weather list options">
            <LuEllipsis />
          </summary>
          <div className={styles.menu}>
            <button
              onClick={() => {
                setEditing(!editing);
                closeMenu();
              }}
              disabled={!locations.length}
            >
              {editing ? "Done editing" : "Edit list"}
            </button>
            <button
              onClick={() => {
                void refreshLocations(true);
                closeMenu();
              }}
              disabled={!locations.length || refreshingLocations}
            >
              <LuRefreshCw /> Refresh forecasts
            </button>
            <button onClick={locate} disabled={busy}>
              <LuLocateFixed /> Use current location
            </button>
            <div className={styles.units} aria-label="Temperature units">
              <button aria-pressed={celsius} onClick={() => setCelsius(true)}>
                °C {celsius && <LuCheck />}
              </button>
              <button aria-pressed={!celsius} onClick={() => setCelsius(false)}>
                °F {!celsius && <LuCheck />}
              </button>
            </div>
          </div>
        </details>
      </header>
      <div ref={listRef} className={styles.scroller}>
        {editing && (
          <div className={styles.editHeader}>
            <span>Edit locations</span>
            <button onClick={() => setEditing(false)}>Done</button>
          </div>
        )}
        {locations.length ? (
          <ul className={styles.list}>
            {locations.map((location, index) => (
              <li key={location.id} className={styles.row}>
                {editing && (
                  <button
                    className={styles.remove}
                    aria-label={`Remove ${location.isCurrent ? "current location" : location.name}`}
                    onClick={() => {
                      removeLocation(location.id);
                      setAnnouncement(`${location.name} removed`);
                    }}
                  >
                    <LuMinus />
                  </button>
                )}
                <button
                  data-weather-location={location.id}
                  className={styles.card}
                  data-sky={
                    location.condition.code >= 3
                      ? "cloudy"
                      : !location.condition.is_day
                        ? "night"
                        : location.condition.code === 2
                          ? "partly"
                          : "clear"
                  }
                  disabled={editing || busy}
                  onClick={() => void openLocation(location.id)}
                  aria-label={`Open ${location.isCurrent ? "current location" : location.name}, ${temp(location.temperature)}, ${conditionText(location)}`}
                >
                  <div className={styles.clouds} aria-hidden="true" />
                  <span className={styles.city}>
                    {location.isCurrent ? "Current Location" : location.name}
                  </span>
                  <span className={styles.temperature}>
                    {temp(location.temperature)}
                  </span>
                  <span className={styles.localTime}>
                    {location.isCurrent ? "My Location" : localTime(location)}
                    {!location.isCurrent &&
                    location.region &&
                    location.region !== location.name
                      ? ` · ${location.region}`
                      : ""}
                  </span>
                  <span className={styles.condition}>
                    {conditionText(location)}
                  </span>
                  <span className={styles.highLow}>
                    H:{temp(location.high)} L:{temp(location.low)}
                  </span>
                  {locationErrors[location.id] && (
                    <span className={styles.stale}>
                      Saved weather · Couldn’t update
                    </span>
                  )}
                </button>
                {editing && !location.isCurrent && (
                  <div className={styles.reorder}>
                    <button
                      aria-label={`Move ${location.name} up`}
                      disabled={index === 0 || locations[index - 1].isCurrent}
                      onClick={() => moveLocation(location.id, -1)}
                    >
                      <LuArrowUp />
                    </button>
                    <button
                      aria-label={`Move ${location.name} down`}
                      disabled={index === locations.length - 1}
                      onClick={() => moveLocation(location.id, 1)}
                    >
                      <LuArrowDown />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <LuCloud />
            <h2>Your weather, at a glance</h2>
            <p>Search below to save a city and follow its forecast.</p>
            <button onClick={locate} disabled={busy}>
              <LuLocateFixed />{" "}
              {locating ? "Finding your location…" : "Use current location"}
            </button>
          </div>
        )}
        {locations.some((location) => Boolean(locationErrors[location.id])) && (
          <button
            className={styles.retry}
            disabled={refreshingLocations}
            onClick={() => void refreshLocations(true)}
          >
            {refreshingLocations
              ? "Updating forecasts…"
              : "Retry updating saved weather"}
          </button>
        )}
        {locations.length > 0 && (
          <p className={styles.credits}>
            Learn more about{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              weather data
            </a>
            .
          </p>
        )}
      </div>
      <div className={styles.searchArea}>
        {(error || locationError) && (
          <p role="alert" className={styles.error}>
            {error || locationError}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim() && !busy) void add(query.trim());
          }}
          className={styles.search}
          aria-label="Add a weather location"
        >
          <LuSearch />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a city or postcode"
            aria-label="Search for a city or postcode"
            autoComplete="off"
            enterKeyHint="search"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={!query.trim() || busy}
            aria-label="Add location"
          >
            {busy ? <LuRefreshCw className={styles.spinning} /> : <LuPlus />}
          </button>
        </form>
        {busy && (
          <span role="status" className={styles.progress}>
            {locating ? "Finding your location…" : "Getting forecast…"}
          </span>
        )}
      </div>
      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
