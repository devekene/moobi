import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { IPHONE_MODELS, type IPhoneModelId } from "@/lib/iphone-models";

type DeviceState = {
  selectedModelId: IPhoneModelId;
  setSelectedModelId: (modelId: IPhoneModelId) => void;
};

export const createDeviceStore = (storage: StateStorage) =>
  create<DeviceState>()(
    persist(
      (set) => ({
        selectedModelId: IPHONE_MODELS[0].id,
        setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      }),
      {
        name: "moobi-virtual-iphone-model",
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({ selectedModelId: state.selectedModelId }),
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

export const useDeviceStore = createDeviceStore(browserStorage);
