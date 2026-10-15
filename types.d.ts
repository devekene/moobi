import type React from "react";

type ScreenOptions = import("@/lib/app-registry").PhoneScreen;

// CameraGallery
type GalleryScreen = "album" | "image-view" | "video-player" | "library";

type MediaType = "photo" | "video";

declare interface GalleryMedia {
  type: MediaType;
  url: string;
  title: string;
}

// Browser
type BrowserScreen =
  | "browser-home"
  | "browser-history"
  | "browser-bookmark"
  | "browser-search-results"
  | "browser-frame";
type MusicPlayerScreen = "library" | "search" | "nowPlaying" | "widget";
type ClockScreen = "world" | "alarm" | "timer" | "stopwatch";

interface MediaItem {
  id: string;
  type: MediaType;
  thumbnail: string;
  title?: string;
  date: Date;
  isFavorite: boolean;
  duration?: string;
}

interface HistoryType {
  id: number;
  query: string;
  url?: string;
  time: string;
}

declare interface BrowserBookmarkProps {
  setScreen: React.Dispatch<React.SetStateAction<BrowserScreen>>;
  setProjectId: React.Dispatch<React.SetStateAction<string>>;
}

declare interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  albumArt: string;
  genre: string;
  streamUrl: string;
  permalink?: string;
  playCount?: number;
  favoriteCount?: number;
  repostCount?: number;
}

interface CustomSearchResultData {
  title: string;
  link: string;
  displayLink?: string;
  snippet?: string;
  formattedUrl?: string;
  htmlSnippet?: string;
  pagemap?: string;
}

interface CustomSearchResult {
  query: string;
  totalResults: string;
  searchTime: string;
  results: CustomSearchResultData[];
  nextPage?: {
    startIndex: number;
  };
  previousPage?: {
    startIndex: number;
  };
  onPageChange?: (startIndex: number) => void;
}

interface WeatherCondition {
  text: string;
  icon: string;
  code: number;
}

interface CurrentWeather {
  temp_c: number;
  temp_f: number;
  condition: WeatherCondition;
  wind_mph: number;
  wind_kph: number;
  wind_dir: string;
  pressure_mb: number;
  pressure_in: number;
  precip_mm: number;
  precip_in: number;
  humidity: number;
  cloud: number;
  feelslike_c: number;
  feelslike_f: number;
  vis_km: number;
  vis_miles: number;
  uv: number;
  gust_mph: number;
  gust_kph: number;
}

interface HourlyWeather {
  time_epoch: number;
  time: string;
  temp_c: number;
  temp_f: number;
  is_day: number;
  condition: WeatherCondition;
  wind_mph: number;
  wind_kph: number;
  wind_dir: string;
  pressure_mb: number;
  pressure_in: number;
  precip_mm: number;
  precip_in: number;
  humidity: number;
  cloud: number;
  feelslike_c: number;
  feelslike_f: number;
  chance_of_rain: number;
  chance_of_snow: number;
  vis_km: number;
  vis_miles: number;
  gust_mph: number;
  gust_kph: number;
  uv: number;
}

interface DailyWeather {
  date: string;
  date_epoch: number;
  day: {
    maxtemp_c: number;
    maxtemp_f: number;
    mintemp_c: number;
    mintemp_f: number;
    avgtemp_c: number;
    avgtemp_f: number;
    maxwind_mph: number;
    maxwind_kph: number;
    totalprecip_mm: number;
    totalprecip_in: number;
    avghumidity: number;
    daily_will_it_rain: number;
    daily_chance_of_rain: number;
    daily_will_it_snow: number;
    daily_chance_of_snow: number;
    condition: WeatherCondition;
    uv: number;
  };
  astro: {
    sunrise: string;
    sunset: string;
    moonrise: string;
    moonset: string;
    moon_phase: string;
    moon_illumination: string;
  };
  hour: HourlyWeather[];
}

interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  localtime: string;
}

interface WeatherData {
  location: WeatherLocation;
  current: CurrentWeather;
  forecast: {
    forecastday: DailyWeather[];
  };
  alerts: any[];
  air_quality: any;
}

interface Timezone {
  timezone: string;
  city?: string;
  countryCode?: string;
  localTime?: string;
  utcOffset?: string;
}

interface Alarm {
  id: number;
  time: string;
  label: string | null;
  enabled: boolean;
  repeatMode: "once" | "daily" | "weekday" | "custom";
  repeatDays?: number[];
  snoozeEnabled?: boolean;
  snoozeDuration?: number;
  isWakeUp?: boolean;
  lastTriggerKey?: string;
  snoozeUntil?: number;
}

type CalendarScreen = "home" | "event" | "add-edit";

type CalendarEventCategory =
  | "event"
  | "birthday"
  | "anniversary"
  | "holiday"
  | "other";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  category: CalendarEventCategory;
  description?: string;
  time?: string;
  isGlobal: boolean;
}

// NOTES
type ToDoPriority = "low" | "medium" | "high";
type NoteType = "note" | "todo";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: ToDoPriority;
  dueDate?: string;
}

interface Note {
  id: string;
  title: string;
  content?: string;
  type: NoteType;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isArchived: boolean;
  todos?: TodoItem[];
  color?: string;
}

declare interface NewsArticle {
  id: string;
  content: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
  image: string;
}
