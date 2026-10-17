import { encryptedStorage } from "@/lib/encrypted-storage";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export type PhoneAppearance = "light" | "dark";

type PhoneAppearanceState = {
  appearance: PhoneAppearance;
  setAppearance: (appearance: PhoneAppearance) => void;
  toggleAppearance: () => void;
};

export const createPhoneAppearanceStore = (storage: StateStorage) =>
  create<PhoneAppearanceState>()(
    persist(
      (set) => ({
        appearance: "dark",
        setAppearance: (appearance) => set({ appearance }),
        toggleAppearance: () =>
          set((state) => ({
            appearance: state.appearance === "dark" ? "light" : "dark",
          })),
      }),
      {
        name: "moobi-phone-appearance",
        storage: createJSONStorage(() => storage),
        skipHydration: storage === encryptedStorage,
        partialize: (state) => ({ appearance: state.appearance }),
      },
    ),
  );

export const usePhoneAppearanceStore =
  createPhoneAppearanceStore(encryptedStorage);
