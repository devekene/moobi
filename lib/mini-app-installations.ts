import { compareVersions } from "@/lib/store-catalog";
import { browserCipher } from "@/lib/encrypted-storage";
import {
  packageDigest,
  parseMiniAppPackage,
  isRecord,
  type MiniAppPackage,
} from "@/lib/mini-app-package";
import {
  createMiniAppStorage,
  withMiniAppStorageLock,
} from "@/lib/mini-app-storage";
import {
  parsePrivateApp,
  parsePrivateRelease,
  UUID,
  type PrivateApp,
  type PrivateRelease,
} from "@/lib/private-store-contract";

export interface InstalledApp {
  app: PrivateApp;
  release: PrivateRelease;
  installedAt: string;
  autoUpdate?: boolean;
  rollbackVersion?: string;
}
interface Installation extends InstalledApp {
  package: MiniAppPackage;
  previous?: {
    app: PrivateApp;
    release: PrivateRelease;
    package: MiniAppPackage;
    installedAt: string;
  };
}

/** Packages and their installation metadata commit together as one encrypted IDB record. */
export function createInstallationRepository(
  cipher = browserCipher,
  databaseName = "moobi-mini-apps-v1",
) {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("installations");
        request.result.createObjectStore("data");
      };
      request.onerror = () => reject(request.error);
      let blocked = false;
      request.onblocked = () => {
        blocked = true;
        reject(new Error("Close other Moobi tabs and retry app storage."));
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
  async function read(store: string, key: string): Promise<unknown> {
    const db = await open();
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const request = tx.objectStore(store).get(key);
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }
  async function write(store: string, key: string, value: string, add = false) {
    const db = await open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        if (add) tx.objectStore(store).add(value, key);
        else tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () =>
          reject(
            new Error(
              "App storage could not be saved. Existing installation was preserved.",
            ),
          );
      });
    } finally {
      db.close();
    }
  }
  function scope(accountId: string) {
    if (!UUID.test(accountId))
      throw new Error("Sign in to access installed apps.");
    return `moobi-installed:v1:${accountId}`;
  }
  const adapters = new Map<string, ReturnType<typeof createMiniAppStorage>>();
  function storage(accountId: string, preview = false) {
    const namespace = scope(accountId) + (preview ? ":preview" : "");
    let adapter = adapters.get(namespace);
    if (!adapter) {
      adapter = createMiniAppStorage(
        {
          getItem: async (key) => {
            const value = await read("data", key);
            if (value === undefined) return null;
            if (typeof value !== "string")
              throw new Error("Unreadable app data.");
            return value;
          },
          setItem: (key, value) => write("data", key, value),
        },
        cipher,
        namespace,
      );
      adapters.set(namespace, adapter);
    }
    return adapter;
  }
  async function decode(
    accountId: string,
    appId: string,
    encrypted: unknown,
  ): Promise<Installation> {
    if (typeof encrypted !== "string")
      throw new Error(
        "App files are missing. Download the app again from your library.",
      );
    const raw: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await cipher.decrypt(encrypted, `${scope(accountId)}:${appId}:package`),
      ),
    );
    if (
      !isRecord(raw) ||
      typeof raw.installedAt !== "string" ||
      !Number.isFinite(Date.parse(raw.installedAt))
    )
      throw new Error(
        "Installed app record is unreadable. Saved data was preserved.",
      );
    const app = parsePrivateApp(raw.app);
    const release = parsePrivateRelease(raw.release);
    const parsed = parseMiniAppPackage(JSON.stringify(raw.package));
    if (
      app.id !== appId ||
      release.appId !== appId ||
      parsed.manifest.id !== appId ||
      parsed.manifest.version !== release.version ||
      release.status !== "published" ||
      (await packageDigest(parsed)) !== release.digest ||
      new TextEncoder().encode(JSON.stringify(parsed)).byteLength !==
        release.byteSize
    )
      throw new Error(
        "Installed app integrity check failed. Saved data was preserved.",
      );
    let previous: Installation["previous"];
    if (raw.previous !== undefined) {
      if (!isRecord(raw.previous))
        throw new Error("Recovery package is unreadable.");
      const previousApp = parsePrivateApp(raw.previous.app);
      const previousRelease = parsePrivateRelease(raw.previous.release);
      const previousPackage = parseMiniAppPackage(
        JSON.stringify(raw.previous.package),
      );
      if (
        previousApp.id !== appId ||
        previousRelease.appId !== appId ||
        previousPackage.manifest.id !== appId ||
        previousPackage.manifest.version !== previousRelease.version ||
        typeof raw.previous.installedAt !== "string" ||
        (await packageDigest(previousPackage)) !== previousRelease.digest
      )
        throw new Error("Recovery package failed integrity verification.");
      previous = {
        app: previousApp,
        release: previousRelease,
        package: previousPackage,
        installedAt: raw.previous.installedAt,
      };
    }
    return {
      app,
      release,
      package: parsed,
      installedAt: raw.installedAt,
      autoUpdate: raw.autoUpdate === true,
      previous,
      ...(previous ? { rollbackVersion: previous.release.version } : {}),
    };
  }
  return {
    storage,
    async list(
      accountId: string,
    ): Promise<{ installations: InstalledApp[]; brokenAppIds: string[] }> {
      scope(accountId);
      const db = await open();
      let values: { key: string; value: unknown }[];
      try {
        values = await new Promise((resolve, reject) => {
          const tx = db.transaction("installations", "readonly");
          const request = tx
            .objectStore("installations")
            .openCursor(
              IDBKeyRange.bound(`${accountId}:`, `${accountId}:\uffff`),
            );
          const found: { key: string; value: unknown }[] = [];
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              if (typeof cursor.key !== "string") {
                tx.abort();
                return;
              }
              found.push({
                key: cursor.key.slice(accountId.length + 1),
                value: cursor.value,
              });
              cursor.continue();
            }
          };
          tx.oncomplete = () => resolve(found);
          tx.onabort = tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
      const installations: InstalledApp[] = [];
      const brokenAppIds: string[] = [];
      for (const { key, value } of values) {
        try {
          const entry = await decode(accountId, key, value);
          installations.push({
            app: entry.app,
            release: entry.release,
            installedAt: entry.installedAt,
            autoUpdate: entry.autoUpdate,
            rollbackVersion: entry.rollbackVersion,
          });
        } catch {
          brokenAppIds.push(key);
        }
      }
      return { installations, brokenAppIds };
    },
    async load(accountId: string, appId: string) {
      scope(accountId);
      return decode(
        accountId,
        appId,
        await read("installations", `${accountId}:${appId}`),
      );
    },
    async install(
      accountId: string,
      app: PrivateApp,
      release: PrivateRelease,
      source: string,
    ): Promise<InstalledApp> {
      const namespace = scope(accountId);
      const parsed = parseMiniAppPackage(source);
      if (
        release.status !== "published" ||
        release.appId !== app.id ||
        parsed.manifest.id !== app.id ||
        parsed.manifest.version !== release.version ||
        (await packageDigest(parsed)) !== release.digest ||
        new TextEncoder().encode(JSON.stringify(parsed)).byteLength !==
          release.byteSize
      )
        throw new Error(
          "Downloaded package does not match the published release.",
        );
      return withMiniAppStorageLock(`${namespace}:${app.id}`, async () => {
        const key = `${accountId}:${app.id}`;
        const existing = await read("installations", key);
        if (existing !== undefined) {
          const previous = await decode(accountId, app.id, existing);
          if (
            previous.release.digest !== release.digest ||
            previous.release.id !== release.id
          )
            throw new Error(
              "Another version is already installed. Use Update to replace it safely.",
            );
          return {
            app: previous.app,
            release: previous.release,
            installedAt: previous.installedAt,
          };
        }
        const metadata = {
          app,
          release,
          installedAt: new Date().toISOString(),
        };
        const bytes = new TextEncoder().encode(
          JSON.stringify({ ...metadata, package: parsed }),
        );
        await write(
          "installations",
          key,
          await cipher.encrypt(bytes.buffer, `${namespace}:${app.id}:package`),
          true,
        );
        return metadata;
      });
    },
    async update(
      accountId: string,
      app: PrivateApp,
      release: PrivateRelease,
      source: string,
      expectedReleaseId: string,
      automatic = false,
    ): Promise<InstalledApp> {
      const namespace = scope(accountId);
      const parsed = parseMiniAppPackage(source);
      if (
        release.status !== "published" ||
        release.appId !== app.id ||
        parsed.manifest.id !== app.id ||
        parsed.manifest.version !== release.version ||
        (await packageDigest(parsed)) !== release.digest ||
        new TextEncoder().encode(JSON.stringify(parsed)).byteLength !==
          release.byteSize
      )
        throw new Error(
          "Update failed integrity verification. Your installed version is kept.",
        );
      return withMiniAppStorageLock(`${namespace}:${app.id}`, async () => {
        const key = `${accountId}:${app.id}`;
        const previous = await decode(
          accountId,
          app.id,
          await read("installations", key),
        );
        if (previous.release.id !== expectedReleaseId)
          throw new Error(
            "The installed version changed in another tab. Refresh and retry.",
          );
        if (compareVersions(release.version, previous.release.version) <= 0)
          throw new Error(
            "Choose a newer release. Existing installation was preserved.",
          );
        if (
          (parsed.manifest.storageVersion ?? 1) !==
          (previous.package.manifest.storageVersion ?? 1)
        )
          throw new Error(
            "This update requires an unsupported saved-data migration. Your installed version and data were preserved.",
          );
        if (
          automatic &&
          (!previous.autoUpdate ||
            parsed.manifest.permissions.some(
              (permission) =>
                !previous.package.manifest.permissions.includes(permission),
            ))
        )
          throw new Error(
            "This update needs permission confirmation. Install it manually.",
          );
        const entry: Installation = {
          app,
          release,
          package: parsed,
          installedAt: new Date().toISOString(),
          autoUpdate: previous.autoUpdate === true,
          previous: {
            app: previous.app,
            release: previous.release,
            package: previous.package,
            installedAt: previous.installedAt,
          },
          rollbackVersion: previous.release.version,
        };
        await write(
          "installations",
          key,
          await cipher.encrypt(
            new TextEncoder().encode(JSON.stringify(entry)).buffer,
            `${namespace}:${app.id}:package`,
          ),
        );
        return {
          app: entry.app,
          release: entry.release,
          installedAt: entry.installedAt,
          autoUpdate: entry.autoUpdate,
          rollbackVersion: entry.rollbackVersion,
        };
      });
    },
    async setAutoUpdate(accountId: string, appId: string, enabled: boolean) {
      const namespace = scope(accountId);
      return withMiniAppStorageLock(`${namespace}:${appId}`, async () => {
        const key = `${accountId}:${appId}`;
        const entry = await decode(
          accountId,
          appId,
          await read("installations", key),
        );
        entry.autoUpdate = enabled;
        await write(
          "installations",
          key,
          await cipher.encrypt(
            new TextEncoder().encode(JSON.stringify(entry)).buffer,
            `${namespace}:${appId}:package`,
          ),
        );
      });
    },
    async rollback(accountId: string, appId: string): Promise<InstalledApp> {
      const namespace = scope(accountId);
      return withMiniAppStorageLock(`${namespace}:${appId}`, async () => {
        const key = `${accountId}:${appId}`;
        const current = await decode(
          accountId,
          appId,
          await read("installations", key),
        );
        if (!current.previous)
          throw new Error("No recovery version is stored on this phone.");
        const entry: Installation = { ...current.previous, autoUpdate: false };
        await write(
          "installations",
          key,
          await cipher.encrypt(
            new TextEncoder().encode(JSON.stringify(entry)).buffer,
            `${namespace}:${appId}:package`,
          ),
        );
        return {
          app: entry.app,
          release: entry.release,
          installedAt: entry.installedAt,
          autoUpdate: false,
        };
      });
    },
    async uninstall(accountId: string, appId: string, deleteData: boolean) {
      const namespace = scope(accountId);
      await withMiniAppStorageLock(`${namespace}:${appId}`, async () => {
        const db = await open();
        try {
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(["installations", "data"], "readwrite");
            tx.objectStore("installations").delete(`${accountId}:${appId}`);
            if (deleteData)
              tx.objectStore("data").delete(`${namespace}:${appId}`);
            tx.oncomplete = () => resolve();
            tx.onabort = tx.onerror = () => reject(tx.error);
          });
        } finally {
          db.close();
        }
      });
    },
  };
}
export const installationRepository = createInstallationRepository();
