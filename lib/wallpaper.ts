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

async function accessWallpaper(
  write: boolean,
  blob: Blob | null = null,
): Promise<Blob | null> {
  const database = await openDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = database.transaction(
        "images",
        write ? "readwrite" : "readonly",
      );
      const store = transaction.objectStore("images");
      let result: Blob | null = null;
      if (write) {
        if (blob) store.put(blob, "home");
        else store.delete("home");
      } else {
        const request = store.get("home");
        request.onsuccess = () => {
          const value: unknown = request.result;
          if (value instanceof Blob) result = value;
        };
      }
      // A request succeeding does not mean its transaction has committed.
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Wallpaper storage failed."));
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Wallpaper storage failed."));
    });
  } finally {
    database.close();
  }
}

export const wallpaperStorage: WallpaperStorage = {
  read: () => accessWallpaper(false),
  write: async (blob) => {
    await accessWallpaper(true, blob);
  },
};
