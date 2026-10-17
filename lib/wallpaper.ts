import { browserCipher, withStorageLock } from "@/lib/encrypted-storage";
export const WALLPAPER_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
export const MAX_WALLPAPER_BYTES = 15 * 1024 * 1024;

export function validateWallpaper(file: Blob) {
  if (!WALLPAPER_ACCEPT.split(",").includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, or AVIF image.");
  }
  if (!file.size || file.size > MAX_WALLPAPER_BYTES) {
    throw new Error("Choose an image smaller than 15 MB.");
  }
}

export function wallpaperSize(width: number, height: number) {
  const scale = Math.min(1, 1920 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// Decode and re-encode locally: bound the saved image and discard source metadata.
export async function prepareWallpaper(file: Blob): Promise<Blob> {
  validateWallpaper(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const size = wallpaperSize(image.naturalWidth, image.naturalHeight);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(image, 0, 0, size.width, size.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Could not process this image.")),
        "image/webp",
        0.88,
      );
    });
  } catch {
    throw new Error(
      "Could not read this image. Try another JPEG, PNG, WebP, or AVIF.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface WallpaperStorage {
  read: () => Promise<Blob | null>;
  write: (blob: Blob | null) => Promise<void>;
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open("moobi-wallpaper", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "Wallpaper storage is busy. Close other Moobi tabs and retry.",
        ),
      );
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

type EncryptedWallpaper = {
  format: "moobi-wallpaper-v1";
  type: string;
  data: string;
};
const wallpaperContext = (type: string) =>
  `indexedDB:moobi-wallpaper:images:home:${type}`;

async function accessWallpaper(
  mode: "read" | "write" | "migrate",
  value: EncryptedWallpaper | null = null,
): Promise<unknown> {
  const database = await openDatabase();
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(
        "images",
        mode === "read" ? "readonly" : "readwrite",
      );
      const store = transaction.objectStore("images");
      let result: unknown = null;
      if (mode === "write") {
        if (value) store.put(value, "home");
        else store.delete("home");
      } else {
        const request = store.get("home");
        request.onsuccess = () => {
          result = request.result;
          // Do not replace a concurrently saved encrypted wallpaper or resurrect a deletion.
          if (mode === "migrate" && result instanceof Blob && value)
            store.put(value, "home");
        };
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error ?? new Error("Wallpaper storage failed."));
    });
  } finally {
    database.close();
  }
}

async function encryptWallpaper(blob: Blob): Promise<EncryptedWallpaper> {
  return {
    format: "moobi-wallpaper-v1",
    type: blob.type,
    data: await browserCipher.encrypt(
      await blob.arrayBuffer(),
      wallpaperContext(blob.type),
    ),
  };
}

export const wallpaperStorage: WallpaperStorage = {
  read: () =>
    withStorageLock("wallpaper:home", async () => {
      const value = await accessWallpaper("read");
      if (value === null || value === undefined) return null;
      if (value instanceof Blob) {
        await accessWallpaper("migrate", await encryptWallpaper(value));
        return value;
      }
      if (
        typeof value !== "object" ||
        !("format" in value) ||
        value.format !== "moobi-wallpaper-v1" ||
        !("type" in value) ||
        typeof value.type !== "string" ||
        !("data" in value) ||
        typeof value.data !== "string"
      )
        throw new Error(
          "Saved wallpaper could not be opened. Existing data was preserved.",
        );
      return new Blob(
        [await browserCipher.decrypt(value.data, wallpaperContext(value.type))],
        { type: value.type },
      );
    }),
  write: (blob) =>
    withStorageLock("wallpaper:home", async () => {
      await accessWallpaper(
        "write",
        blob ? await encryptWallpaper(blob) : null,
      );
    }),
};
