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
  code: number;
  is_day: boolean;
}

interface CurrentWeather {
  pressure_mb: number;
  wind_kph: number;
  wind_degree: number;
  gust_kph: number;
  uv: number;
  dewpoint_c: number;
  time_epoch: number;
  temp_c: number;
  temp_f: number;
  condition: WeatherCondition;
  wind_mph: number;
  wind_dir: string;
  humidity: number;
  feelslike_c: number;
  feelslike_f: number;
  vis_miles: number | null;
}

interface HourlyWeather {
  wind_kph: number;
  precip_mm: number;
  time_epoch: number;
  time: string;
  temp_c: number;
  temp_f: number;
  condition: WeatherCondition;
  chance_of_rain: number;
}

interface DailyWeather {
  date: string;
  sunrise: number;
  sunset: number;
  moonrise: number | null;
  moonset: number | null;
  moon_phase: number;
  day: {
    maxtemp_c: number;
    maxtemp_f: number;
    mintemp_c: number;
    mintemp_f: number;
    daily_chance_of_rain: number;
    totalprecip_mm: number;
    uv: number;
    condition: WeatherCondition;
  };
  hour: HourlyWeather[];
}

interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  localtime: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

interface WeatherData {
  location: WeatherLocation;
  current: CurrentWeather;
  forecast: { forecastday: DailyWeather[] };
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
  /** Local YYYY-MM-DD calendar date, without a time zone or time of day. */
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
