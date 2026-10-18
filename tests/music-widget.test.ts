import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MusicWidget from "@/components/screens/MusicWidget";
import type { Song } from "@/types";

const song: Song = {
  id: "a",
  title: "Track",
  artist: "Artist",
  album: "Single",
  duration: 120,
  genre: "Ambient",
  albumArt: "",
  streamUrl: "",
};
const renderWidget = (
  currentSong: Song | null,
  isPlaying = false,
  canSkip = true,
  isLoading = false,
) =>
  renderToStaticMarkup(
    createElement(MusicWidget, {
      currentSong,
      isPlaying,
      canSkip,
      isLoading,
      audioError: null,
      onPlayPause: () => {},
      onPrevious: () => {},
      onNext: () => {},
    }),
  );

describe("Control Center music transport", () => {
  it("renders three independent labelled controls without an app-opening action", () => {
    const html = renderWidget(song);
    expect(html.match(/<button\b/g)).toHaveLength(3);
    for (const label of ["Previous track", "Play music", "Next track"])
      expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain('role="group"');
    expect(html).not.toContain("Open Music");
    expect(html).not.toContain("disabled=");
    expect(renderWidget(song, true)).toContain('aria-label="Pause music"');
  });
  it("disables unavailable transport controls with no selected track", () => {
    expect(renderWidget(null).match(/disabled=""/g)).toHaveLength(3);
  });
  it("keeps play available for a single track and disables skips", () => {
    expect(renderWidget(song, false, false).match(/disabled=""/g)).toHaveLength(
      2,
    );
  });
  it("announces loading and prevents repeated play requests while connecting", () => {
    const html = renderWidget(song, false, true, true);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading music");
    expect(html.match(/disabled=""/g)).toHaveLength(1);
  });
});
