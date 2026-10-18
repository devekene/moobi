import { useMusicStore } from "@/stores/useMusicStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import type { Song } from "@/types";

// One browser audio element for every app screen and system widget. It outlives
// React mounts so navigating home never creates competing playback sessions.
let audio: HTMLAudioElement | null = null;
let requestId = 0;
let loadedSongId: string | null = null;

export function getMusicAudio(): HTMLAudioElement {
  if (audio) return audio;
  const element = new Audio();
  audio = element;
  element.preload = "metadata";
  const syncVolume = () => {
    const settings = usePhoneSettingsStore.getState();
    element.volume = settings.volume / 100;
    element.muted = settings.silentMode;
  };
  syncVolume();
  usePhoneSettingsStore.subscribe(syncVolume);
  element.addEventListener("timeupdate", () => {
    useMusicStore.getState().setProgress([element.currentTime]);
  });
  element.addEventListener("durationchange", () => {
    useMusicStore.setState({
      duration: Number.isFinite(element.duration) ? element.duration : 0,
    });
  });
  element.addEventListener("playing", () => {
    useMusicStore.setState({
      isPlaying: true,
      isLoading: false,
      audioError: null,
    });
  });
  element.addEventListener("pause", () =>
    useMusicStore.getState().setIsPlaying(false),
  );
  element.addEventListener("waiting", () =>
    useMusicStore.getState().setIsLoading(true),
  );
  element.addEventListener("error", () => {
    useMusicStore.setState({
      isPlaying: false,
      isLoading: false,
      audioError: "This track couldn’t load. Try again or choose another.",
    });
  });
  element.addEventListener("ended", () => {
    const state = useMusicStore.getState();
    if (state.repeatMode === "one") {
      element.currentTime = 0;
      void resumeMusic();
    } else {
      const index = state.queue.findIndex(
        (song) => song.id === state.currentSong?.id,
      );
      if (
        state.queue.length > 0 &&
        (state.isShuffled ||
          index < state.queue.length - 1 ||
          state.repeatMode === "all")
      ) {
        skipMusic(1);
      } else {
        useMusicStore.setState({ isPlaying: false, isLoading: false });
      }
    }
  });
  return element;
}

async function resumeMusic() {
  try {
    await getMusicAudio().play();
  } catch {
    useMusicStore.setState({
      isPlaying: false,
      isLoading: false,
      audioError: "Playback couldn’t start. Tap play to retry.",
    });
  }
}

export async function playMusic(
  song: Song,
  options: { openPlayer?: boolean } = {},
) {
  const id = ++requestId;
  const element = getMusicAudio();
  element.pause();
  loadedSongId = null;
  useMusicStore.setState({
    currentSong: song,
    duration: 0,
    progress: [0],
    isPlaying: false,
    isLoading: true,
    audioError: null,
  });
  const state = useMusicStore.getState();
  if (
    options.openPlayer !== false &&
    state.currentPlayerScreen !== "nowPlaying"
  )
    state.setCurrentPlayerScreen("nowPlaying");
  try {
    const response = await fetch(
      `/api/music-player/stream?id=${encodeURIComponent(song.id)}`,
    );
    const data: unknown = await response.json();
    if (id !== requestId) return;
    if (
      !response.ok ||
      typeof data !== "object" ||
      data === null ||
      !("streamUrl" in data) ||
      typeof data.streamUrl !== "string" ||
      !("success" in data) ||
      data.success !== true
    )
      throw new Error("Stream unavailable");
    element.src = data.streamUrl;
    loadedSongId = song.id;
    element.load();
    await resumeMusic();
  } catch {
    if (id === requestId)
      useMusicStore.setState({
        isPlaying: false,
        isLoading: false,
        audioError: "This track is unavailable right now. Tap play to retry.",
      });
  }
}

function togglePlayback(openPlayer: boolean) {
  const state = useMusicStore.getState();
  if (!state.currentSong) return;
  if (state.isPlaying) getMusicAudio().pause();
  else if (loadedSongId !== state.currentSong.id || state.audioError)
    void playMusic(state.currentSong, { openPlayer });
  else void resumeMusic();
}

export function toggleMusic() {
  togglePlayback(false);
}

export function toggleCollectionMusic() {
  const { savedSongs, currentSong, setQueue } = useMusicStore.getState();
  if (!savedSongs.length) return;
  setQueue(savedSongs);
  if (savedSongs.some((song) => song.id === currentSong?.id)) {
    togglePlayback(false);
  } else {
    void playMusic(savedSongs[0], { openPlayer: false });
  }
}

export function skipMusic(direction: 1 | -1) {
  const { currentSong, queue, isShuffled } = useMusicStore.getState();
  if (!queue.length) return;
  const index = queue.findIndex((song) => song.id === currentSong?.id);
  const step =
    isShuffled && queue.length > 1
      ? 1 + Math.floor(Math.random() * (queue.length - 1))
      : direction;
  const next = (((index + step) % queue.length) + queue.length) % queue.length;
  void playMusic(queue[next], { openPlayer: false });
}

export function seekMusic(progress: number[]) {
  const element = getMusicAudio();
  if (!Number.isFinite(element.duration) || !Number.isFinite(progress[0]))
    return;
  element.currentTime = Math.min(element.duration, Math.max(0, progress[0]));
  useMusicStore.getState().setProgress([element.currentTime]);
}
