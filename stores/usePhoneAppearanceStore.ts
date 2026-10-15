import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

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
      partialize: (state) => ({ appearance: state.appearance }),
    },
    ),
  );

const browserStorage: StateStorage = {
  getItem: (name) =>
    typeof window === "undefined" ? null : window.localStorage.getItem(name),
  setItem: (name, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

export const usePhoneAppearanceStore = createPhoneAppearanceStore(browserStorage);
