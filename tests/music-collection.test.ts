import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CollectionHeader from "@/components/screens/music-player/CollectionHeader";
import type { Song } from "@/types";

const songs: Song[] = Array.from({ length: 5 }, (_, index) => ({
  id: String(index),
  title: `Track ${index}`,
  artist: "Artist",
  album: "Single",
  duration: 120,
  genre: "Ambient",
  albumArt: `/cover-${index}.jpg`,
  streamUrl: "",
}));

const renderHeader = (
  saved: Song[],
  currentSong: Song | null = null,
  isPlaying = false,
) =>
  renderToStaticMarkup(
    createElement(CollectionHeader, {
      songs: saved,
      currentSong,
      isPlaying,
      isLoading: false,
      audioError: null,
      onToggle: () => {},
    }),
  );

describe("collection header", () => {
  it("omits the entire section for an empty collection", () => {
    expect(renderHeader([])).toBe("");
  });
  it("uses only the first four saved covers in order", () => {
    const html = renderHeader(songs);
    expect(html.match(/<img\b/g)).toHaveLength(4);
    expect(html.indexOf('src="/cover-0.jpg"')).toBeLessThan(
      html.indexOf('src="/cover-3.jpg"'),
    );
    expect(html).not.toContain("cover-4.jpg");
    expect(html).not.toContain("worth keeping");
  });
  it("does not duplicate covers in a smaller collection", () => {
    for (const count of [1, 2, 3]) {
      const html = renderHeader(songs.slice(0, count));
      expect(html.match(/<img\b/g)).toHaveLength(count);
      expect(html).toContain(`data-count="${count}"`);
    }
  });
  it("offers pause only when a collection track is playing", () => {
    expect(renderHeader(songs.slice(0, 4), songs[0], true)).toContain(
      'aria-label="Pause collection"',
    );
    expect(renderHeader(songs.slice(0, 4), songs[4], true)).toContain(
      'aria-label="Play collection"',
    );
    expect(renderHeader(songs, songs[0], false)).toContain(
      'aria-label="Play collection"',
    );
  });
});
