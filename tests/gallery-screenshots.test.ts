import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cipher = vi.hoisted(() => ({
  encrypt: vi.fn(async (bytes: ArrayBuffer) =>
    Array.from(new Uint8Array(bytes)).join(","),
  ),
  decrypt: vi.fn(
    async (value: string) =>
      Uint8Array.from(value.split(",").filter(Boolean).map(Number)).buffer,
  ),
}));

vi.mock("@/lib/encrypted-storage", () => ({
  browserCipher: cipher,
  withStorageLock: async <T>(_name: string, action: () => Promise<T>) =>
    action(),
}));

import {
  galleryScreenshotStorage,
  MAX_GALLERY_SCREENSHOTS,
} from "@/lib/gallery-screenshots";

const clearDatabase = () =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("moobi-gallery");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

describe("Gallery screenshot persistence", () => {
  beforeEach(async () => {
    await clearDatabase();
    vi.clearAllMocks();
  });

  it("encrypts image bytes and restores the screenshot metadata", async () => {
    const blob = new Blob([new Uint8Array([3, 8, 13])], { type: "image/png" });
    const date = new Date("2026-10-24T12:34:56.000Z");

    const saved = await galleryScreenshotStorage.save(
      blob,
      "screen-lock",
      date,
    );
    const restored = await galleryScreenshotStorage.list();

    expect(saved.title).toBe("Lock screenshot");
    expect(cipher.encrypt).toHaveBeenCalledOnce();
    expect(cipher.decrypt).toHaveBeenCalledOnce();
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      id: saved.id,
      screen: "screen-lock",
      createdAt: date.toISOString(),
      title: "Lock screenshot",
    });
    expect(new Uint8Array(await restored[0].blob.arrayBuffer())).toEqual(
      new Uint8Array([3, 8, 13]),
    );
  });

  it("keeps only the newest bounded set of captures", async () => {
    for (let index = 0; index < MAX_GALLERY_SCREENSHOTS + 2; index += 1) {
      await galleryScreenshotStorage.save(
        new Blob([String(index)], { type: "image/png" }),
        "home",
        new Date(Date.UTC(2026, 9, 24, 12, 0, index)),
      );
    }

    const restored = await galleryScreenshotStorage.list();
    expect(restored).toHaveLength(MAX_GALLERY_SCREENSHOTS);
    expect(restored[0].createdAt).toBe("2026-10-24T12:00:21.000Z");
    expect(restored.at(-1)?.createdAt).toBe("2026-10-24T12:00:02.000Z");
  });
});
