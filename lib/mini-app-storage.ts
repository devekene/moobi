import { browserCipher, withStorageLock } from "@/lib/encrypted-storage";
import { isRecord } from "@/lib/mini-app-package";

export const MAX_APP_STORAGE_BYTES = 32 * 1024;
export const MAX_APP_VALUE_BYTES = 4 * 1024;
export function validStorageKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(key) &&
    !["__proto__", "constructor", "prototype"].includes(key)
  );
}

interface Backend {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
}

const queues = new Map<string, Promise<unknown>>();
export async function withMiniAppStorageLock<T>(
  name: string,
  action: () => Promise<T>,
): Promise<T> {
  const result = (queues.get(name) ?? Promise.resolve())
    .catch(() => {})
    .then(() => withStorageLock(name, action));
  queues.set(name, result);
  try {
    return await result;
  } finally {
    if (queues.get(name) === result) queues.delete(name);
  }
}

/** Uses the shared cipher/lock but rejects failed writes so SDK never reports false success. */
export function createMiniAppStorage(
  backend: Backend,
  cipher = browserCipher,
  namespace = "moobi-external-preview:v1",
) {
  return async (
    appId: string,
    operation: "get" | "set" | "remove",
    key: string,
    value?: string,
  ) => {
    if (!/^[a-z][a-z0-9.-]{2,63}$/.test(appId) || !validStorageKey(key))
      throw new Error("Invalid storage key.");
    const name = `${namespace}:${appId}`;
    return withMiniAppStorageLock(name, async () => {
      const saved = await backend.getItem(name);
      let entries: Record<string, string> = {};
      if (saved !== null) {
        const raw: unknown = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            await cipher.decrypt(saved, name),
          ),
        );
        if (
          !isRecord(raw) ||
          Object.keys(raw).length > 32 ||
          Object.entries(raw).some(
            ([entryKey, entryValue]) =>
              !validStorageKey(entryKey) ||
              typeof entryValue !== "string" ||
              new TextEncoder().encode(entryValue).byteLength >
                MAX_APP_VALUE_BYTES,
          ) ||
          new TextEncoder().encode(JSON.stringify(raw)).byteLength >
            MAX_APP_STORAGE_BYTES
        )
          throw new Error(
            "Saved preview data is unreadable. Existing data was preserved.",
          );
        entries = Object.fromEntries(
          Object.entries(raw).map(([entryKey, entryValue]) => [
            entryKey,
            String(entryValue),
          ]),
        );
      }
      if (operation === "get")
        return Object.hasOwn(entries, key) ? entries[key] : null;
      if (operation === "remove") delete entries[key];
      else {
        if (
          typeof value !== "string" ||
          new TextEncoder().encode(value).byteLength > MAX_APP_VALUE_BYTES
        )
          throw new Error("Values must be strings up to 4 KiB.");
        entries[key] = value;
      }
      const bytes = new TextEncoder().encode(JSON.stringify(entries));
      if (
        Object.keys(entries).length > 32 ||
        bytes.byteLength > MAX_APP_STORAGE_BYTES
      )
        throw new Error("Preview storage quota reached (32 keys / 32 KiB).");
      await backend.setItem(name, await cipher.encrypt(bytes.buffer, name));
      return null;
    });
  };
}

export const previewStorage = createMiniAppStorage({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
});
