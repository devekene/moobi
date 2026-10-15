import { create } from "zustand";
import {
  prepareWallpaper,
  wallpaperStorage,
  type WallpaperStorage,
} from "@/lib/wallpaper";

type WallpaperState = {
  url: string | null;
  status: "idle" | "loading" | "saving";
  error: string | null;
  initialize: () => Promise<void>;
  choose: (file: Blob) => Promise<void>;
  reset: () => Promise<void>;
};

export function createWallpaperStore(
  storage: WallpaperStorage,
  prepare = prepareWallpaper,
  urls = {
    create: (blob: Blob) => URL.createObjectURL(blob),
    revoke: (url: string) => URL.revokeObjectURL(url),
  },
) {
  let loaded = false;
  let loading: Promise<void> | null = null;
  return create<WallpaperState>((set, get) => {
    const replaceUrl = (url: string | null) => {
      const previous = get().url;
      set({ url });
      if (previous) urls.revoke(previous);
    };
    const save = async (file: Blob | null) => {
      if (get().status !== "idle") return;
      set({ status: "saving", error: null });
      let nextUrl: string | null = null;
      try {
        const blob = file ? await prepare(file) : null;
        nextUrl = blob ? urls.create(blob) : null;
        await storage.write(blob);
        loaded = true;
        replaceUrl(nextUrl);
      } catch (error) {
        if (nextUrl) urls.revoke(nextUrl);
        set({
          error:
            error instanceof Error && error.name !== "QuotaExceededError"
              ? error.message
              : "Could not save wallpaper. Browser storage may be full or unavailable.",
        });
      } finally {
        set({ status: "idle" });
      }
    };
    return {
      url: null,
      status: "idle",
      error: null,
      initialize: () => {
        if (loading) return loading;
        if ((loaded && !get().error) || get().status !== "idle")
          return Promise.resolve();
        set({ status: "loading", error: null });
        loading = (async () => {
          try {
            const blob = await storage.read();
            replaceUrl(blob ? urls.create(blob) : null);
            loaded = true;
          } catch {
            set({
              error:
                "Could not load saved wallpaper. Retry or choose another image.",
            });
          } finally {
            set({ status: "idle" });
            loading = null;
          }
        })();
        return loading;
      },
      choose: (file) => save(file),
      reset: () => save(null),
    };
  });
}

export const useWallpaperStore = createWallpaperStore(wallpaperStorage);
