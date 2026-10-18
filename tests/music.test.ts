import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatMusicTime, readMusicTracks } from "@/lib/music-catalog";
import type { Song } from "@/types";

vi.mock("@/lib/encrypted-storage", () => ({
  encryptedStorage: {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

const song: Song = {
  id: "a",
  title: "A",
  artist: "Artist",
  album: "Single",
  duration: 125,
  genre: "Ambient",
  albumArt: "",
  streamUrl: "",
};

class FakeAudio extends EventTarget {
  volume = 1;
  muted = false;
  preload = "";
  src = "";
  currentTime = 0;
  duration = 125;
  load = vi.fn();
  play = vi.fn(async () => {
    this.dispatchEvent(new Event("playing"));
  });
  pause = vi.fn(() => {
    this.dispatchEvent(new Event("pause"));
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        streamUrl: "https://example.com/audio.mp3",
      }),
    })),
  );
});

describe("music catalog", () => {
  it("validates catalog tracks and rejects unavailable responses", () => {
    expect(
      readMusicTracks({
        success: true,
        data: [song, { id: "bad" }, { ...song, duration: -5 }],
      }),
    ).toEqual([song]);
    expect(() => readMusicTracks({ success: false })).toThrow();
  });
  it("formats times without invalid or negative output", () => {
    expect(formatMusicTime(125)).toBe("2:05");
    expect(formatMusicTime(NaN)).toBe("0:00");
    expect(formatMusicTime(-10)).toBe("0:00");
  });
});

describe("shared music playback", () => {
  it("uses one audio owner and keeps playback alive across consumers", async () => {
    const playback = await import("@/lib/music-playback");
    const { useMusicStore } = await import("@/stores/useMusicStore");
    expect(playback.getMusicAudio()).toBe(playback.getMusicAudio());
    await playback.playMusic(song);
    expect(useMusicStore.getState().isPlaying).toBe(true);
    playback.toggleMusic();
    expect(useMusicStore.getState().isPlaying).toBe(false);
    playback.toggleMusic();
    expect(useMusicStore.getState().isPlaying).toBe(true);
    playback.getMusicAudio().currentTime = 35;
    playback.getMusicAudio().dispatchEvent(new Event("timeupdate"));
    expect(useMusicStore.getState().progress).toEqual([35]);
  });
  it("ignores a stale stream response after selecting another track", async () => {
    const playback = await import("@/lib/music-playback");
    let resolveFirst: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirst = resolve;
            }),
        )
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, streamUrl: "second" }),
        }),
    );
    const first = playback.playMusic(song);
    await playback.playMusic({ ...song, id: "b" });
    resolveFirst({
      ok: true,
      json: async () => ({ success: true, streamUrl: "first" }),
    });
    await first;
    expect(playback.getMusicAudio().src).toBe("second");
  });
  it("reports unavailable streams and allows retry", async () => {
    const playback = await import("@/lib/music-playback");
    const { useMusicStore } = await import("@/stores/useMusicStore");
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ success: false }, { status: 503 }),
    );
    await playback.playMusic(song);
    expect(useMusicStore.getState().audioError).toContain("unavailable");
    expect(useMusicStore.getState().isLoading).toBe(false);
    await playback.playMusic(song);
    expect(useMusicStore.getState().isPlaying).toBe(true);
  });
  it("advances a queue, stops at its end, and honors repeat one", async () => {
    const playback = await import("@/lib/music-playback");
    const { useMusicStore } = await import("@/stores/useMusicStore");
    useMusicStore.getState().setQueue([song, { ...song, id: "b" }]);
    await playback.playMusic(song);
    playback.getMusicAudio().dispatchEvent(new Event("ended"));
    await vi.waitFor(() =>
      expect(useMusicStore.getState().currentSong?.id).toBe("b"),
    );
    await vi.waitFor(() =>
      expect(useMusicStore.getState().isPlaying).toBe(true),
    );
    playback.getMusicAudio().dispatchEvent(new Event("ended"));
    expect(useMusicStore.getState().isPlaying).toBe(false);
    useMusicStore.getState().setRepeatMode("one");
    playback.getMusicAudio().currentTime = 125;
    playback.getMusicAudio().dispatchEvent(new Event("ended"));
    expect(playback.getMusicAudio().currentTime).toBe(0);
  });
  it("starts, pauses, and resumes the collection without leaving its screen", async () => {
    const playback = await import("@/lib/music-playback");
    const { useMusicStore } = await import("@/stores/useMusicStore");
    useMusicStore.setState({
      savedSongs: [song, { ...song, id: "b" }],
      currentPlayerScreen: "library",
    });
    playback.toggleCollectionMusic();
    await vi.waitFor(() =>
      expect(useMusicStore.getState().isPlaying).toBe(true),
    );
    expect(useMusicStore.getState().currentPlayerScreen).toBe("library");
    expect(useMusicStore.getState().queue.map((track) => track.id)).toEqual([
      "a",
      "b",
    ]);
    playback.getMusicAudio().currentTime = 40;
    playback.toggleCollectionMusic();
    expect(useMusicStore.getState().isPlaying).toBe(false);
    playback.toggleCollectionMusic();
    expect(useMusicStore.getState().isPlaying).toBe(true);
    expect(playback.getMusicAudio().currentTime).toBe(40);
    expect(fetch).toHaveBeenCalledTimes(1);
    playback.getMusicAudio().dispatchEvent(new Event("ended"));
    await vi.waitFor(() =>
      expect(useMusicStore.getState().currentSong?.id).toBe("b"),
    );
    expect(useMusicStore.getState().currentPlayerScreen).toBe("library");
  });
  it("does nothing for an empty collection and replaces unrelated playback when populated", async () => {
    const playback = await import("@/lib/music-playback");
    const { useMusicStore } = await import("@/stores/useMusicStore");
    playback.toggleCollectionMusic();
    expect(fetch).not.toHaveBeenCalled();
    await playback.playMusic({ ...song, id: "other" });
    useMusicStore.setState({
      savedSongs: [song],
      currentPlayerScreen: "library",
    });
    playback.toggleCollectionMusic();
    await vi.waitFor(() =>
      expect(useMusicStore.getState().currentSong?.id).toBe("a"),
    );
    expect(useMusicStore.getState().currentPlayerScreen).toBe("library");
  });
  it("controls a restored track and skips in Control Center without navigating", async () => {
    const playback = await import("@/lib/music-playback");
    const { useMusicStore } = await import("@/stores/useMusicStore");
    const { usePhoneStore } = await import("@/stores/usePhoneStore");
    usePhoneStore.setState({ currentScreen: "home", showControlCenter: true });
    useMusicStore.setState({
      currentSong: song,
      queue: [song, { ...song, id: "b" }],
      currentPlayerScreen: "library",
    });
    playback.toggleMusic();
    await vi.waitFor(() =>
      expect(useMusicStore.getState().isPlaying).toBe(true),
    );
    playback.toggleMusic();
    expect(useMusicStore.getState().isPlaying).toBe(false);
    playback.skipMusic(1);
    await vi.waitFor(() =>
      expect(useMusicStore.getState().currentSong?.id).toBe("b"),
    );
    await vi.waitFor(() =>
      expect(useMusicStore.getState().isPlaying).toBe(true),
    );
    playback.skipMusic(-1);
    await vi.waitFor(() =>
      expect(useMusicStore.getState().currentSong?.id).toBe("a"),
    );
    expect(useMusicStore.getState().currentPlayerScreen).toBe("library");
    expect(usePhoneStore.getState().currentScreen).toBe("home");
    expect(usePhoneStore.getState().showControlCenter).toBe(true);
  });
  it("stores saved songs without duplicates and removes them explicitly", async () => {
    const { useMusicStore } = await import("@/stores/useMusicStore");
    useMusicStore.getState().toggleSavedSong(song);
    expect(useMusicStore.getState().savedSongs).toEqual([song]);
    expect(
      useMusicStore.persist.getOptions().partialize?.(useMusicStore.getState()),
    ).toMatchObject({ savedSongs: [song] });
    useMusicStore.getState().toggleSavedSong(song);
    expect(useMusicStore.getState().savedSongs).toEqual([]);
  });
});
