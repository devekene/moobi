import { encryptedStorage } from "@/lib/encrypted-storage";
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
        skipHydration: storage === encryptedStorage,
        partialize: (state) => ({ selectedModelId: state.selectedModelId }),
      },
    ),
  );

export const useDeviceStore = createDeviceStore(encryptedStorage);
