import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { encryptedStorage } from "@/lib/encrypted-storage";
import {
  advance,
  newRound,
  turn,
  type Direction,
  type Round,
  type SnakeMode,
} from "@/lib/snake";

type Records = Record<SnakeMode, number>;
type SnakeState = {
  mode: SnakeMode;
  records: Records;
  games: number;
  bestBites: number;
  round: Round;
  chooseMode: (mode: SnakeMode) => void;
  start: () => void;
  steer: (direction: Direction) => void;
  tick: () => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
};
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function count(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}
export const createSnakeStore = (storage: StateStorage) => {
  // Movement stays in memory. Only changed records/preferences reach encrypted storage.
  let lastSaved: string | null = null;
  const recordsStorage: StateStorage = {
    getItem: async (name) => {
      const value = await storage.getItem(name);
      lastSaved = value;
      return value;
    },
    setItem: async (name, value) => {
      if (value === lastSaved) return;
      lastSaved = value;
      try {
        await storage.setItem(name, value);
      } catch (error) {
        if (lastSaved === value) lastSaved = null;
        throw error;
      }
    },
    removeItem: (name) => {
      lastSaved = null;
      return storage.removeItem(name);
    },
  };
  return create<SnakeState>()(
    persist(
      (set) => ({
        mode: "classic",
        records: { mellow: 0, classic: 0, rush: 0 },
        games: 0,
        bestBites: 0,
        round: newRound(),
        chooseMode: (mode) =>
          set((state) => (state.round.status === "ready" ? { mode } : {})),
        start: () =>
          set((state) => ({
            round: { ...newRound(), status: "playing" },
            games: state.games + 1,
          })),
        steer: (direction) =>
          set((state) => ({ round: turn(state.round, direction) })),
        tick: () =>
          set((state) => {
            const round = advance(state.round, state.mode);
            return {
              round,
              records: {
                ...state.records,
                [state.mode]: Math.max(state.records[state.mode], round.score),
              },
              bestBites: Math.max(state.bestBites, round.score / 10),
            };
          }),
        pause: () =>
          set((state) =>
            state.round.status === "playing"
              ? { round: { ...state.round, status: "paused", queued: [] } }
              : {},
          ),
        resume: () =>
          set((state) =>
            state.round.status === "paused"
              ? { round: { ...state.round, status: "playing" } }
              : {},
          ),
        finish: () => set({ round: newRound() }),
      }),
      {
        name: "moobi-snake",
        storage: createJSONStorage(() => recordsStorage),
        skipHydration: true,
        partialize: ({ mode, records, games, bestBites }) => ({
          mode,
          records,
          games,
          bestBites,
        }),
        merge: (saved, current) => {
          if (!isObject(saved)) return current;
          const records = isObject(saved.records) ? saved.records : {};
          return {
            ...current,
            mode:
              saved.mode === "mellow" || saved.mode === "rush"
                ? saved.mode
                : "classic",
            records: {
              mellow: count(records.mellow),
              classic: count(records.classic),
              rush: count(records.rush),
            },
            games: count(saved.games),
            bestBites: count(saved.bestBites),
          };
        },
      },
    ),
  );
};
export const useSnakeStore = createSnakeStore(encryptedStorage);
