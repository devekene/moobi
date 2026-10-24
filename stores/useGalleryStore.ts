import { create } from "zustand";
import {
  galleryScreenshotStorage,
  MAX_GALLERY_SCREENSHOTS,
  type GalleryScreenshotFile,
  type GalleryScreenshotStorage,
} from "@/lib/gallery-screenshots";

export interface GalleryScreenshot extends GalleryScreenshotFile {
  url: string;
}

type GalleryState = {
  screenshots: GalleryScreenshot[];
  status: "idle" | "loading" | "saving";
  error: string | null;
  initialize: () => Promise<void>;
  saveScreenshot: (blob: Blob, screen: string, date?: Date) => Promise<boolean>;
};

const defaultUrls = {
  create: (blob: Blob) => URL.createObjectURL(blob),
  revoke: (url: string) => URL.revokeObjectURL(url),
};

export function createGalleryStore(
  storage: GalleryScreenshotStorage,
  urls = defaultUrls,
) {
  let initialized = false;
  let loading: Promise<void> | null = null;
  return create<GalleryState>((set, get) => ({
    screenshots: [],
    status: "idle",
    error: null,
    initialize: () => {
      if (loading) return loading;
      if (initialized) return Promise.resolve();
      set({ status: "loading", error: null });
      loading = storage
        .list()
        .then((files) => {
          get().screenshots.forEach((item) => urls.revoke(item.url));
          set({
            screenshots: files.map((file) => ({
              ...file,
              url: urls.create(file.blob),
            })),
            status: "idle",
          });
          initialized = true;
        })
        .catch(() => {
          set({
            status: "idle",
            error:
              "Saved screenshots could not be loaded. Try reopening Gallery.",
          });
        })
        .finally(() => {
          loading = null;
        });
      return loading;
    },
    saveScreenshot: async (blob, screen, date) => {
      if (!initialized) await get().initialize();
      set({ status: "saving", error: null });
      try {
        const file = await storage.save(blob, screen, date);
        const screenshot = { ...file, url: urls.create(file.blob) };
        const screenshots = [
          screenshot,
          ...get().screenshots.filter((item) => item.id !== screenshot.id),
        ];
        screenshots
          .slice(MAX_GALLERY_SCREENSHOTS)
          .forEach((item) => urls.revoke(item.url));
        set({
          screenshots: screenshots.slice(0, MAX_GALLERY_SCREENSHOTS),
          status: "idle",
        });
        return true;
      } catch {
        set({
          status: "idle",
          error:
            "This screenshot was downloaded but could not be saved in Gallery.",
        });
        return false;
      }
    },
  }));
}

export const useGalleryStore = createGalleryStore(galleryScreenshotStorage);
