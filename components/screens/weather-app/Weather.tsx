"use client";

import dynamic from "next/dynamic";
import { useWeatherStore } from "@/stores/useWeatherStore";
import WeatherLocations from "./WeatherLocations";

const WeatherForecast = dynamic(() => import("./WeatherForecast"), {
  loading: () => (
    <div role="status" className="flex h-full items-center justify-center">
      Opening forecast…
    </div>
  ),
});

export default function Weather() {
  const view = useWeatherStore((state) => state.view);
  return view === "list" ? <WeatherLocations /> : <WeatherForecast />;
}
