import { encryptedStorage } from "@/lib/encrypted-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MusicPlayerScreen, Song } from "@/types";

interface MusicState {
  // Audio state
  currentSong: Song | null;
  queue: Song[];
  progress: number[];
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  audioError: string | null;

  // Player UI state
  currentPlayerScreen: MusicPlayerScreen;
  lastPlayerScreen: MusicPlayerScreen;

  savedSongs: Song[];
  toggleSavedSong: (song: Song) => void;

  // Playback settings
  isShuffled: boolean;
  repeatMode: "off" | "all" | "one";

  // Actions
  setCurrentSong: (song: Song | null) => void;
  setQueue: (queue: Song[]) => void;
  setProgress: (progress: number[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setAudioError: (error: string | null) => void;
  setCurrentPlayerScreen: (screen: MusicPlayerScreen) => void;
  setLastPlayerScreen: (screen: MusicPlayerScreen) => void;
  setIsShuffled: (shuffled: boolean) => void;
  setRepeatMode: (mode: "off" | "all" | "one") => void;
  toggleRepeat: () => void;
  reset: () => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSong: null,
      queue: [],
      progress: [0],
      duration: 0,
      isPlaying: false,
      isLoading: false,
      audioError: null,
      currentPlayerScreen: "library",
      lastPlayerScreen: "library",
      isShuffled: false,
      repeatMode: "off",

      savedSongs: [],
      toggleSavedSong: (song) =>
        set((state) => ({
          savedSongs: state.savedSongs.some((saved) => saved.id === song.id)
            ? state.savedSongs.filter((saved) => saved.id !== song.id)
            : [song, ...state.savedSongs],
        })),

      // Actions
      setCurrentSong: (song) => set({ currentSong: song }),

      setQueue: (queue) => set({ queue }),

      setProgress: (progress) => set({ progress }),

      setIsPlaying: (isPlaying) => set({ isPlaying }),

      setIsLoading: (isLoading) => set({ isLoading }),

      setAudioError: (error) => set({ audioError: error }),

      setCurrentPlayerScreen: (screen) => {
        const { currentPlayerScreen } = get();
        set({
          currentPlayerScreen: screen,
          lastPlayerScreen: currentPlayerScreen,
        });
      },

      setLastPlayerScreen: (screen) => set({ lastPlayerScreen: screen }),

      setIsShuffled: (shuffled) => set({ isShuffled: shuffled }),

      setRepeatMode: (mode) => set({ repeatMode: mode }),

      toggleRepeat: () => {
        const { repeatMode } = get();
        const modes: Array<"off" | "all" | "one"> = ["off", "all", "one"];
        const currentIndex = modes.indexOf(repeatMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        set({ repeatMode: modes[nextIndex] });
      },

      reset: () => {
        set({
          currentSong: null,
          progress: [0],
          duration: 0,
          isPlaying: false,
          isLoading: false,
          audioError: null,
          currentPlayerScreen: "library",
        });
      },
    }),
    {
      name: "music-storage",
      storage: createJSONStorage(() => encryptedStorage),
      skipHydration: true,
      partialize: (state) => ({
        savedSongs: state.savedSongs,
        queue: state.queue,
        currentSong: state.currentSong,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
        currentPlayerScreen: state.currentPlayerScreen,
      }),
    },
  ),
);
