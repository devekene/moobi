import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { browserEncryptionKey } from "@/lib/encrypted-storage";
import { wallpaperStorage } from "@/lib/wallpaper";

function open(name: string, store: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function record(
  databaseName: string,
  storeName: string,
  key: string,
  write?: { value: unknown },
): Promise<unknown> {
  const db = await open(databaseName, storeName);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        storeName,
        write ? "readwrite" : "readonly",
      );
      const store = transaction.objectStore(storeName);
      let result: unknown;
      if (write) store.put(write.value, key);
      else {
        const request = store.get(key);
        request.onsuccess = () => {
          result = request.result;
        };
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  // Reset the browser key cache just as a fresh page load would.
  vi.resetModules();
});

describe("encryption key transactions", () => {
  it("persists one non-extractable key under concurrent first use and reopens it", async () => {
    const keys = await Promise.all(
      Array.from({ length: 8 }, () => browserEncryptionKey()),
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      keys[0],
      new TextEncoder().encode("secret"),
    );
    for (const key of [...keys, await browserEncryptionKey()]) {
      expect(key.extractable).toBe(false);
      const value = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted,
      );
      expect(new TextDecoder().decode(value)).toBe("secret");
    }
    const saved = await record("moobi-security", "keys", "installation-v1");
    expect(saved).toBeInstanceOf(CryptoKey);
  });
  it("refuses to replace a malformed stored key", async () => {
    await record("moobi-security", "keys", "installation-v1", {
      value: "corrupt key",
    });
    await expect(browserEncryptionKey()).rejects.toThrow(
      "Saved data was preserved",
    );
    expect(await record("moobi-security", "keys", "installation-v1")).toBe(
      "corrupt key",
    );
  });
  it("fails clearly without crypto or IndexedDB", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(browserEncryptionKey()).rejects.toThrow("HTTPS");
  });
});

describe("encrypted wallpaper database", () => {
  it("migrates an existing image and reads it after a fresh module load", async () => {
    const original = new Blob([new Uint8Array([0, 255, 1, 127])], {
      type: "image/webp",
    });
    await record("moobi-wallpaper", "images", "home", { value: original });
    const { wallpaperStorage: storage } = await import("@/lib/wallpaper");
    expect(await (await storage.read())?.arrayBuffer()).toEqual(
      await original.arrayBuffer(),
    );
    const saved = await record("moobi-wallpaper", "images", "home");
    expect(saved).not.toBeInstanceOf(Blob);
    expect(saved).toMatchObject({
      format: "moobi-wallpaper-v1",
      type: "image/webp",
    });
    vi.resetModules();
    const { wallpaperStorage: reopened } = await import("@/lib/wallpaper");
    expect(await (await reopened.read())?.arrayBuffer()).toEqual(
      await original.arrayBuffer(),
    );
  });
  it("writes encrypted images, rejects MIME tampering, and allows explicit reset", async () => {
    const { wallpaperStorage: storage } = await import("@/lib/wallpaper");
    await storage.write(new Blob(["private image"], { type: "image/png" }));
    const saved = await record("moobi-wallpaper", "images", "home");
    expect(JSON.stringify(saved)).not.toContain("private image");
    if (!saved || typeof saved !== "object")
      throw new Error("Missing wallpaper");
    await record("moobi-wallpaper", "images", "home", {
      value: { ...saved, type: "image/jpeg" },
    });
    await expect(storage.read()).rejects.toThrow();
    expect(await record("moobi-wallpaper", "images", "home")).toMatchObject({
      type: "image/jpeg",
    });
    await storage.write(null);
    expect(await storage.read()).toBeNull();
  });
  it("preserves unknown records rather than treating them as missing", async () => {
    await record("moobi-wallpaper", "images", "home", {
      value: { format: "future-v2", data: "keep" },
    });
    await expect(wallpaperStorage.read()).rejects.toThrow("preserved");
    expect(await record("moobi-wallpaper", "images", "home")).toEqual({
      format: "future-v2",
      data: "keep",
    });
  });
});
