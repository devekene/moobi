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
  availableModelIds: readonly IPhoneModelId[];
  setSelectedModelId: (modelId: IPhoneModelId) => void;
  setAvailableModelIds: (modelIds: readonly IPhoneModelId[]) => void;
};

export const createDeviceStore = (storage: StateStorage) =>
  create<DeviceState>()(
    persist(
      (set) => ({
        selectedModelId: IPHONE_MODELS[0].id,
        availableModelIds: IPHONE_MODELS.map((model) => model.id),
        setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
        setAvailableModelIds: (availableModelIds) =>
          set({ availableModelIds }),
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
