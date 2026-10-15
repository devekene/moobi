import { describe, expect, it, vi } from "vitest";
import {
  MAX_WALLPAPER_BYTES,
  validateWallpaper,
  wallpaperSize,
  type WallpaperStorage,
} from "@/lib/wallpaper";
import { createWallpaperStore } from "@/stores/useWallpaperStore";
import { usePhoneStore } from "@/stores/usePhoneStore";

function setup(initial: Blob | null = null) {
  let saved = initial;
  const storage: WallpaperStorage = {
    read: vi.fn(async () => saved),
    write: vi.fn(async (blob) => {
      saved = blob;
    }),
  };
  let count = 0;
  const urls = { create: vi.fn(() => `blob:${++count}`), revoke: vi.fn() };
  const prepare = vi.fn(async (blob: Blob) => {
    validateWallpaper(blob);
    return blob;
  });
  const store = createWallpaperStore(storage, prepare, urls);
  return { storage, urls, prepare, store };
}
const photo = () => new Blob(["photo"], { type: "image/png" });

describe("wallpaper", () => {
  it("rejects unsupported, empty, and oversized files", () => {
    expect(() =>
      validateWallpaper(new Blob(["svg"], { type: "image/svg+xml" })),
    ).toThrow("Choose a JPEG");
    expect(() =>
      validateWallpaper(new Blob([], { type: "image/png" })),
    ).toThrow("15 MB");
    expect(() =>
      validateWallpaper(
        new Blob([new Uint8Array(MAX_WALLPAPER_BYTES + 1)], {
          type: "image/png",
        }),
      ),
    ).toThrow("15 MB");
  });

  it("bounds large images without upscaling and preserves proportions", () => {
    expect(wallpaperSize(4000, 6000)).toEqual({ width: 1280, height: 1920 });
    expect(wallpaperSize(6000, 4000)).toEqual({ width: 1920, height: 1280 });
    expect(wallpaperSize(300, 600)).toEqual({ width: 300, height: 600 });
  });

  it("restores a saved blob once across repeated mounts", async () => {
    const { store, storage } = setup(photo());
    await Promise.all([
      store.getState().initialize(),
      store.getState().initialize(),
    ]);
    await store.getState().initialize();
    expect(storage.read).toHaveBeenCalledTimes(1);
    expect(store.getState().url).toBe("blob:1");
  });

  it("saves, reloads, replaces, and removes the custom image without changing navigation", async () => {
    const { store, storage, urls } = setup();
    const navigation = usePhoneStore.getState();
    await store.getState().choose(photo());
    const restored = createWallpaperStore(storage, async (blob) => blob, urls);
    await restored.getState().initialize();
    expect(restored.getState().url).toBe("blob:2");
    await store.getState().choose(photo());
    expect(urls.revoke).toHaveBeenCalledWith("blob:1");
    await store.getState().reset();
    expect(urls.revoke).toHaveBeenCalledWith("blob:3");
    expect(await storage.read()).toBeNull();
    expect(store.getState().url).toBeNull();
    expect(usePhoneStore.getState()).toBe(navigation);
  });

  it("keeps the prior image and releases a proposed URL on storage failure", async () => {
    const { store, storage, urls } = setup(photo());
    await store.getState().initialize();
    vi.mocked(storage.write).mockRejectedValue(
      new DOMException("Full", "QuotaExceededError"),
    );
    await store.getState().choose(photo());
    expect(store.getState()).toMatchObject({ url: "blob:1", status: "idle" });
    expect(store.getState().error).toContain("storage may be full");
    expect(urls.revoke).toHaveBeenCalledWith("blob:2");
    expect(urls.revoke).not.toHaveBeenCalledWith("blob:1");
    await store.getState().reset();
    expect(store.getState().url).toBe("blob:1");
  });

  it("recovers from unavailable storage by retrying", async () => {
    const { store, storage } = setup(photo());
    vi.mocked(storage.read).mockRejectedValueOnce(new Error("Unavailable"));
    await store.getState().initialize();
    expect(store.getState().error).toContain("Could not load");
    expect(store.getState().url).toBeNull();
    await store.getState().initialize();
    expect(store.getState().error).toBeNull();
    expect(store.getState().url).toBe("blob:1");
  });

  it("retains the current wallpaper when image preparation fails", async () => {
    const { store, storage, prepare } = setup(photo());
    await store.getState().initialize();
    prepare.mockRejectedValueOnce(new Error("Could not read this image."));
    await store.getState().choose(photo());
    expect(storage.write).not.toHaveBeenCalled();
    expect(store.getState().url).toBe("blob:1");
    expect(store.getState().error).toBe("Could not read this image.");
  });

  it("ignores concurrent mutations while a save is in progress", async () => {
    const { store, storage } = setup();
    let finish: (() => void) | undefined;
    vi.mocked(storage.write).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const saving = store.getState().choose(photo());
    await Promise.resolve();
    expect(store.getState().status).toBe("saving");
    await store.getState().reset();
    expect(storage.write).toHaveBeenCalledTimes(1);
    finish?.();
    await saving;
    expect(store.getState().url).toBe("blob:1");
  });
});
