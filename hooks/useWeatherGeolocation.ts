import { useEffect, useRef, useState } from "react";
import { useWeatherStore } from "@/stores/useWeatherStore";
import { useWeatherLocationsStore } from "@/stores/useWeatherLocationsStore";

export function useWeatherGeolocation() {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const locate = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(
        "Location access is unavailable. Search for a city instead.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!active.current) return;
        void (async () => {
          const data = await useWeatherStore
            .getState()
            .fetchWeather(`${coords.latitude},${coords.longitude}`);
          if (!active.current) return;
          if (data) {
            const id = useWeatherLocationsStore
              .getState()
              .saveLocation(data, true);
            if (id) await useWeatherStore.getState().openLocation(id);
            else
              setLocationError(
                "Your list is full. Remove a location to add your current location.",
              );
          } else
            setLocationError(
              useWeatherStore.getState().error ??
                "Unable to load weather for your location.",
            );
          if (active.current) setLocating(false);
        })();
      },
      () => {
        if (active.current) {
          setLocating(false);
          setLocationError(
            "Couldn’t access your location. Allow location access or search for a city.",
          );
        }
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  };
  return { locate, locating, locationError };
}
