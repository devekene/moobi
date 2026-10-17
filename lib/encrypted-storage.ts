import type { StateStorage } from "zustand/middleware";

const PREFIX = "moobi:encrypted:v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

// Key material is deliberately never exported or stored in localStorage.
export async function browserEncryptionKey(): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB)
    throw new Error(
      "Encrypted storage requires HTTPS and browser storage access.",
    );
  const candidate = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("moobi-security", 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore("keys");
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Close other Moobi tabs and retry encrypted storage."));
    };
    request.onsuccess = () => {
      if (blocked) return request.result.close();
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
  try {
    return await new Promise<CryptoKey>((resolve, reject) => {
      // One read/write transaction makes first-key creation atomic across tabs.
      const transaction = database.transaction("keys", "readwrite");
      const store = transaction.objectStore("keys");
      const request = store.get("installation-v1");
      let key: CryptoKey;
      request.onsuccess = () => {
        const saved: unknown = request.result;
        if (saved === undefined) {
          key = candidate;
          store.add(key, "installation-v1");
        } else if (
          saved instanceof CryptoKey &&
          saved.type === "secret" &&
          saved.algorithm.name === "AES-GCM" &&
          !saved.extractable &&
          "length" in saved.algorithm &&
          saved.algorithm.length === 256 &&
          saved.usages.includes("encrypt") &&
          saved.usages.includes("decrypt")
        ) {
          key = saved;
        } else transaction.abort();
      };
      transaction.oncomplete = () => resolve(key);
      transaction.onabort = transaction.onerror = () =>
        reject(
          new Error(
            "Could not open the encryption key. Saved data was preserved.",
          ),
        );
    });
  } finally {
    database.close();
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export function createCipher(getKey: () => Promise<CryptoKey>) {
  return {
    async encrypt(bytes: ArrayBuffer, context: string): Promise<string> {
      const key = await getKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: encoder.encode(context),
          tagLength: 128,
        },
        key,
        bytes,
      );
      return PREFIX + toBase64(iv) + ":" + toBase64(new Uint8Array(ciphertext));
    },
    async decrypt(value: string, context: string): Promise<ArrayBuffer> {
      if (!value.startsWith(PREFIX))
        throw new Error("Unsupported encrypted record.");
      const parts = value.slice(PREFIX.length).split(":");
      if (parts.length !== 2) throw new Error("Invalid encrypted record.");
      const iv = fromBase64(parts[0]);
      const ciphertext = fromBase64(parts[1]);
      if (iv.length !== 12 || ciphertext.length < 16)
        throw new Error("Invalid encrypted record.");
      return crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: encoder.encode(context),
          tagLength: 128,
        },
        await getKey(),
        ciphertext,
      );
    },
  };
}

let keyPromise: Promise<CryptoKey> | undefined;
export const browserCipher = createCipher(() => {
  keyPromise ??= browserEncryptionKey().catch((error: unknown) => {
    keyPromise = undefined;
    throw error;
  });
  return keyPromise;
});

const errors = new Map<string, string>();
const listeners = new Set<() => void>();
let errorMessage = "";
export const storageStatus = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => errorMessage,
  getServerSnapshot: () => "",
};
function report(name: string, failed: boolean) {
  if (failed)
    errors.set(
      name,
      "Saved data could not be opened or changes could not be saved. Keep this tab open and retry. Existing records were preserved.",
    );
  else errors.delete(name);
  errorMessage = errors.values().next().value ?? "";
  listeners.forEach((listener) => listener());
}

// Web Locks also serialize migration and writes from other current-version tabs.
export async function withStorageLock<T>(
  name: string,
  action: () => Promise<T>,
): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks)
    return await navigator.locks.request(`moobi-storage:${name}`, action);
  return action();
}

/** All app-owned string persistence passes through this asynchronous boundary. */
export function createEncryptedStorage(
  storage: StateStorage,
  cipher = browserCipher,
  onError: (name: string, failed: boolean) => void = report,
): StateStorage & { retryWrites: () => Promise<void> } {
  const queues = new Map<string, Promise<unknown>>();
  const unreadable = new Set<string>();
  const pending = new Map<string, string | null>();
  function enqueue<T>(name: string, action: () => Promise<T>): Promise<T> {
    const next = (queues.get(name) ?? Promise.resolve())
      .catch(() => {})
      .then(() => withStorageLock(`localStorage:${name}`, action));
    queues.set(name, next);
    void next
      .finally(() => {
        if (queues.get(name) === next) queues.delete(name);
      })
      .catch(() => {});
    return next;
  }
  async function commit(name: string, value: string | null): Promise<void> {
    try {
      if (value === null) {
        await storage.removeItem(name);
        unreadable.delete(name);
      } else {
        if (unreadable.has(name))
          throw new Error("Saved record is unreadable.");
        await storage.setItem(
          name,
          await cipher.encrypt(
            encoder.encode(value).buffer,
            `localStorage:${name}`,
          ),
        );
      }
      if (pending.get(name) === value) pending.delete(name);
      onError(name, false);
    } catch {
      onError(name, true);
    }
  }
  const adapter: StateStorage & { retryWrites: () => Promise<void> } = {
    retryWrites: async () => {
      await Promise.all(
        [...pending.keys()].map((name) =>
          enqueue(name, async () => {
            // Resolve the pending value at execution, so a retry cannot replay an older edit.
            const value = pending.get(name);
            if (value !== undefined) await commit(name, value);
          }),
        ),
      );
    },
    getItem: (name) =>
      enqueue(name, async () => {
        try {
          const saved = await storage.getItem(name);
          let value = saved;
          if (saved !== null) {
            const context = `localStorage:${name}`;
            if (saved.startsWith(PREFIX))
              value = decoder.decode(await cipher.decrypt(saved, context));
            else {
              // Only migrate valid legacy JSON. Never reinterpret unknown encrypted versions.
              if (
                name === "theme" &&
                ["dark", "light", "system"].includes(saved)
              )
                value = JSON.stringify(saved);
              else JSON.parse(saved);
              const encrypted = await cipher.encrypt(
                encoder.encode(value ?? saved).buffer,
                context,
              );
              if ((await storage.getItem(name)) !== saved)
                throw new Error(
                  "Saved data changed in another tab. Retry loading.",
                );
              await storage.setItem(name, encrypted);
            }
          }
          unreadable.delete(name);
          onError(name, false);
          return value;
        } catch (error) {
          unreadable.add(name);
          onError(name, true);
          throw error;
        }
      }),
    setItem: (name, value) => {
      pending.set(name, value);
      return enqueue(name, () => commit(name, value));
    },
    removeItem: (name) => {
      pending.set(name, null);
      return enqueue(name, () => commit(name, null));
    },
  };
  return adapter;
}

const localStorageBackend: StateStorage = {
  getItem: (name) =>
    typeof window === "undefined" ? null : window.localStorage.getItem(name),
  setItem: (name, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};
export const encryptedStorage = createEncryptedStorage(localStorageBackend);
