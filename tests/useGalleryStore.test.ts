import { describe, expect, it, vi } from "vitest";
import type { GalleryScreenshotStorage } from "@/lib/gallery-screenshots";
import { createGalleryStore } from "@/stores/useGalleryStore";

const screenshot = (
  id: string,
  blob = new Blob([id], { type: "image/png" }),
) => ({
  id,
  title: "Home screenshot",
  screen: "home",
  createdAt: "2026-10-24T12:00:00.000Z",
  blob,
});

describe("Gallery screenshot store", () => {
  it("hydrates saved screenshots into browser-safe object URLs", async () => {
    const storage: GalleryScreenshotStorage = {
      list: vi.fn(async () => [screenshot("saved-1")]),
      save: vi.fn(),
    };
    const urls = {
      create: vi.fn(() => "blob:saved-1"),
      revoke: vi.fn(),
    };
    const store = createGalleryStore(storage, urls);

    await store.getState().initialize();

    expect(store.getState().screenshots).toMatchObject([
      { id: "saved-1", url: "blob:saved-1" },
    ]);
    expect(store.getState().status).toBe("idle");
  });

  it("publishes a captured screenshot after durable storage succeeds", async () => {
    const file = screenshot("new-1");
    const storage: GalleryScreenshotStorage = {
      list: vi.fn(async () => [screenshot("older-1")]),
      save: vi.fn(async () => file),
    };
    const urls = {
      create: vi.fn(() => "blob:new-1"),
      revoke: vi.fn(),
    };
    const store = createGalleryStore(storage, urls);
    const capturedAt = new Date(file.createdAt);

    await expect(
      store.getState().saveScreenshot(file.blob, "home", capturedAt),
    ).resolves.toBe(true);
    expect(storage.save).toHaveBeenCalledWith(file.blob, "home", capturedAt);
    expect(store.getState().screenshots[0]).toMatchObject({
      id: "new-1",
      url: "blob:new-1",
    });
    expect(store.getState().screenshots.map((item) => item.id)).toEqual([
      "new-1",
      "older-1",
    ]);
  });

  it("reports persistence failure without inventing a saved item", async () => {
    const storage: GalleryScreenshotStorage = {
      list: vi.fn(async () => []),
      save: vi.fn(async () => {
        throw new Error("Quota exceeded");
      }),
    };
    const store = createGalleryStore(storage, {
      create: vi.fn(),
      revoke: vi.fn(),
    });

    await expect(
      store.getState().saveScreenshot(new Blob(["shot"]), "home"),
    ).resolves.toBe(false);
    expect(store.getState().screenshots).toEqual([]);
    expect(store.getState().error).toContain("downloaded");
  });
});
