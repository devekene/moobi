import type { Song } from "@/types";

export function formatMusicTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function readMusicTracks(value: unknown): Song[] {
  if (
    typeof value !== "object" ||
    value === null ||
    !("success" in value) ||
    value.success !== true ||
    !("data" in value) ||
    !Array.isArray(value.data)
  )
    throw new Error("Music is temporarily unavailable.");
  return value.data.filter((song: unknown): song is Song => {
    if (typeof song !== "object" || song === null) return false;
    return (
      "id" in song &&
      typeof song.id === "string" &&
      "title" in song &&
      typeof song.title === "string" &&
      "artist" in song &&
      typeof song.artist === "string" &&
      "albumArt" in song &&
      typeof song.albumArt === "string" &&
      "album" in song &&
      typeof song.album === "string" &&
      "genre" in song &&
      typeof song.genre === "string" &&
      "streamUrl" in song &&
      typeof song.streamUrl === "string" &&
      "duration" in song &&
      typeof song.duration === "number" &&
      Number.isFinite(song.duration) &&
      song.duration >= 0
    );
  });
}
