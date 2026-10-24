import { browserCipher, withStorageLock } from "@/lib/encrypted-storage";

export const MAX_GALLERY_SCREENSHOTS = 20;

export interface GalleryScreenshotFile {
  id: string;
  title: string;
  screen: string;
  createdAt: string;
  blob: Blob;
}

interface StoredGalleryScreenshot {
  format: "moobi-gallery-screenshot-v1";
  id: string;
  title: string;
  screen: string;
  createdAt: string;
  type: string;
  data: string;
}

export interface GalleryScreenshotStorage {
  list: () => Promise<GalleryScreenshotFile[]>;
  save: (
    blob: Blob,
    screen: string,
    date?: Date,
  ) => Promise<GalleryScreenshotFile>;
}

const screenshotTitle = (screen: string) => {
  const name = screen
    .replace(/^screen-/, "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
  return `${name || "Phone"} screenshot`;
};

const screenshotContext = (
  record: Pick<StoredGalleryScreenshot, "id" | "type">,
) => `indexedDB:moobi-gallery:screenshots:${record.id}:${record.type}`;

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open("moobi-gallery", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("screenshots", { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error("Gallery storage is busy. Close other Moobi tabs and retry."),
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

async function listStoredScreenshots(): Promise<unknown[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("screenshots", "readonly");
      const request = transaction.objectStore("screenshots").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function writeStoredScreenshot(record: StoredGalleryScreenshot) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("screenshots", "readwrite");
      const store = transaction.objectStore("screenshots");
      store.put(record);
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result
          .filter(isStoredScreenshot)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        records
          .slice(MAX_GALLERY_SCREENSHOTS)
          .forEach((expired) => store.delete(expired.id));
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error ?? new Error("Gallery storage failed."));
    });
  } finally {
    database.close();
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isStoredScreenshot(value: unknown): value is StoredGalleryScreenshot {
  if (!isRecord(value)) return false;
  const record = value;
  return (
    record.format === "moobi-gallery-screenshot-v1" &&
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.screen === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.type === "string" &&
    typeof record.data === "string"
  );
}

const decryptScreenshot = async (
  record: StoredGalleryScreenshot,
): Promise<GalleryScreenshotFile> => ({
  id: record.id,
  title: record.title,
  screen: record.screen,
  createdAt: record.createdAt,
  blob: new Blob(
    [await browserCipher.decrypt(record.data, screenshotContext(record))],
    { type: record.type },
  ),
});

export const galleryScreenshotStorage: GalleryScreenshotStorage = {
  list: () =>
    withStorageLock("gallery:screenshots", async () => {
      const records = await listStoredScreenshots();
      if (!records.every(isStoredScreenshot)) {
        throw new Error(
          "Saved screenshots could not be opened. Existing data was preserved.",
        );
      }
      const files = await Promise.all(records.map(decryptScreenshot));
      return files.sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );
    }),
  save: (blob, screen, date = new Date()) =>
    withStorageLock("gallery:screenshots", async () => {
      const createdAt = date.toISOString();
      const id = `screenshot-${date.getTime()}-${crypto.randomUUID()}`;
      const record: StoredGalleryScreenshot = {
        format: "moobi-gallery-screenshot-v1",
        id,
        title: screenshotTitle(screen),
        screen,
        createdAt,
        type: blob.type || "image/png",
        data: "",
      };
      record.data = await browserCipher.encrypt(
        await blob.arrayBuffer(),
        screenshotContext(record),
      );
      await writeStoredScreenshot(record);
      return { id, title: record.title, screen, createdAt, blob };
    }),
};
