import {
  compareVersions,
  emptyStoreCatalog,
  newestRelease,
  parseStoreCatalog,
  type StoreCatalog,
} from "@/lib/store-catalog";
import { create } from "zustand";
import {
  installationRepository,
  type InstalledApp,
} from "@/lib/mini-app-installations";
import {
  downloadPrivateRelease,
  notifyPrivateStoreChange,
  parsePrivateSession,
  privateRequest,
  type PrivateSession,
} from "@/lib/private-store-client";
import {
  parsePrivateApp,
  parsePrivateCatalog,
  parsePrivateRelease,
  type PrivateCatalog,
  type PrivateRelease,
} from "@/lib/private-store-contract";
import { isRecord, parseMiniAppPackage } from "@/lib/mini-app-package";

interface PendingInstall {
  accountId: string;
  app: InstalledApp["app"];
  release: PrivateRelease;
  source: string;
  expectedReleaseId?: string;
}
interface InstallState extends PrivateSession {
  loading: boolean;
  error: string;
  catalogError: string;
  catalog: PrivateCatalog;
  storeCatalog: StoreCatalog;
  updateNotice: string;
  installations: InstalledApp[];
  pendingInstall: PendingInstall | null;
  brokenAppIds: string[];
  downloading: string | null;
  progress: number;
  refresh: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  prepareInstall: (
    release: PrivateRelease,
    updating?: boolean,
  ) => Promise<void>;
  checkUpdates: () => Promise<void>;
  setAutoUpdate: (appId: string, enabled: boolean) => Promise<void>;
  rollback: (appId: string) => Promise<void>;
  confirmInstall: (automatic?: boolean) => Promise<void>;
  cancelInstall: () => void;
  clearSession: () => void;
  uninstall: (appId: string, deleteData: boolean) => Promise<void>;
}

export function createInstalledAppsStore(
  repository = installationRepository,
  request = privateRequest,
  download = downloadPrivateRelease,
) {
  let generation = 0;
  let checkingUpdates = false;
  let controller: AbortController | null = null;
  return create<InstallState>((set, get) => ({
    configured: false,
    user: null,
    publishingEnabled: false,
    runtimeOrigin: null,
    loading: true,
    error: "",
    catalogError: "",
    catalog: { apps: [], releases: [] },
    storeCatalog: emptyStoreCatalog(),
    updateNotice: "",
    installations: [],
    brokenAppIds: [],
    pendingInstall: null,
    downloading: null,
    progress: 0,
    refresh: async () => {
      const ticket = ++generation;
      try {
        const session = parsePrivateSession(await request("session"));
        if (ticket !== generation) return;
        if (session.user?.id !== get().user?.id) {
          controller?.abort();
          controller = null;
          set({
            ...session,
            installations: [],
            brokenAppIds: [],
            pendingInstall: null,
            downloading: null,
            catalog: { apps: [], releases: [] },
            storeCatalog: emptyStoreCatalog(),
            updateNotice: "",
          });
        }
        const snapshot = session.user
          ? await repository.list(session.user.id)
          : { installations: [], brokenAppIds: [] };
        if (ticket === generation)
          set({ ...session, ...snapshot, loading: false, error: "" });
      } catch (error) {
        if (ticket === generation)
          set({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not open your apps. Retry.",
          });
      }
    },
    loadCatalog: async () => {
      const account = get().user?.id;
      if (!account) return;
      try {
        const value = await request(
          get().publicStoreEnabled ? "store/library" : "catalog",
        );
        const catalog = parsePrivateCatalog(value);
        const storeCatalog = get().publicStoreEnabled
          ? parseStoreCatalog(value)
          : emptyStoreCatalog();
        if (account === get().user?.id)
          set({ catalog, storeCatalog, catalogError: "" });
      } catch (error) {
        if (account === get().user?.id)
          set({
            catalogError:
              error instanceof Error
                ? error.message
                : "Could not load private apps.",
          });
      }
    },
    prepareInstall: async (release, updating = false) => {
      const account = get().user?.id;
      if (!account) throw new Error("Sign in to install this app.");
      if (get().downloading || get().pendingInstall)
        throw new Error("Finish or cancel the current installation first.");
      const installed = get().installations.find(
        (entry) => entry.app.id === release.appId,
      );
      if (installed && !updating)
        throw new Error("This app is already installed.");
      if (
        updating &&
        (!installed ||
          compareVersions(release.version, installed.release.version) <= 0)
      )
        throw new Error("Choose a newer release for this installed app.");
      controller = new AbortController();
      const activeController = controller;
      set({ downloading: release.appId, progress: 0, pendingInstall: null });
      try {
        const result = await request(`releases/${release.id}/acquire`, {
          method: "POST",
        });
        if (!isRecord(result)) throw new Error("Invalid acquisition response.");
        const app = parsePrivateApp(result.app);
        const trusted = parsePrivateRelease(result.release);
        if (
          trusted.id !== release.id ||
          trusted.appId !== app.id ||
          app.id !== release.appId ||
          trusted.status !== "published"
        )
          throw new Error("Unexpected release response.");
        if (account !== get().user?.id || activeController.signal.aborted)
          return;
        const source = await download(
          trusted,
          activeController.signal,
          (progress) => {
            if (account === get().user?.id && !activeController.signal.aborted)
              set({ progress });
          },
        );
        if (account === get().user?.id && !activeController.signal.aborted)
          set({
            pendingInstall: {
              accountId: account,
              app,
              release: trusted,
              source,
              expectedReleaseId: updating ? installed?.release.id : undefined,
            },
          });
      } finally {
        if (controller === activeController) {
          controller = null;
          set({ downloading: null });
        }
      }
    },
    confirmInstall: async (automatic = false) => {
      const pending = get().pendingInstall;
      if (!pending || pending.accountId !== get().user?.id)
        throw new Error("Choose an app to install while signed in.");
      // Parse again at the commit boundary; no unverified package gets a launcher entry.
      parseMiniAppPackage(pending.source);
      const ticket = generation;
      if (get().publicStoreEnabled) {
        const availability = await request(
          `store/releases/${pending.release.id}/availability`,
        );
        if (!isRecord(availability) || availability.available !== true)
          throw new Error(
            "This release is no longer available. Your installed version is kept.",
          );
      }
      if (
        pending.accountId !== get().user?.id ||
        ticket !== generation ||
        get().pendingInstall !== pending
      )
        throw new Error("Your account changed. Choose the release again.");
      const entry = pending.expectedReleaseId
        ? await repository.update(
            pending.accountId,
            pending.app,
            pending.release,
            pending.source,
            pending.expectedReleaseId,
            automatic,
          )
        : await repository.install(
            pending.accountId,
            pending.app,
            pending.release,
            pending.source,
          );
      if (pending.accountId === get().user?.id) {
        generation++;
        set((state) => ({
          installations: [
            ...state.installations.filter((old) => old.app.id !== entry.app.id),
            entry,
          ],
          pendingInstall: null,
        }));
        notifyPrivateStoreChange();
      }
    },
    checkUpdates: async () => {
      if (
        checkingUpdates ||
        (typeof document !== "undefined" && document.hidden)
      )
        return;
      if (
        !get().user ||
        !get().publicStoreEnabled ||
        get().downloading ||
        get().pendingInstall
      )
        return;
      const account = get().user?.id;
      checkingUpdates = true;
      try {
        await get().loadCatalog();
        if (
          !account ||
          account !== get().user?.id ||
          get().catalogError ||
          get().downloading ||
          get().pendingInstall
        )
          return;
        let updated = 0;
        let availableUpdates = 0;
        const failures: string[] = [];
        for (const installed of get().installations) {
          if (
            get().user?.id !== account ||
            get().downloading ||
            get().pendingInstall
          )
            return;
          const candidate = newestRelease(
            get().storeCatalog.releases.filter((release) =>
              get().storeCatalog.availableReleaseIds.includes(release.id),
            ),
            installed.app.id,
          );
          if (
            !candidate ||
            compareVersions(candidate.version, installed.release.version) <= 0
          )
            continue;
          availableUpdates++;
          if (!installed.autoUpdate) continue;
          try {
            await get().prepareInstall(candidate, true);
            if (get().user?.id !== account) return;
            await get().confirmInstall(true);
            updated++;
          } catch (error) {
            if (get().user?.id !== account) return;
            failures.push(
              `${installed.app.name}: ${error instanceof Error ? error.message : "update failed"}`,
            );
            get().cancelInstall();
          }
        }
        if (get().user?.id === account)
          set({
            updateNotice: [
              updated
                ? `${updated} app update${updated === 1 ? "" : "s"} installed. Open again to use the new version.`
                : "",
              availableUpdates > updated
                ? `${availableUpdates - updated} update${availableUpdates - updated === 1 ? "" : "s"} available. Choose Update in My apps.`
                : !updated && !failures.length
                  ? "No newer available releases found."
                  : "",
              ...failures,
            ]
              .filter(Boolean)
              .join(" "),
          });
      } finally {
        checkingUpdates = false;
      }
    },
    setAutoUpdate: async (appId, enabled) => {
      const account = get().user?.id;
      if (!account) throw new Error("Sign in first.");
      await repository.setAutoUpdate(account, appId, enabled);
      if (get().user?.id === account) {
        set((state) => ({
          installations: state.installations.map((entry) =>
            entry.app.id === appId ? { ...entry, autoUpdate: enabled } : entry,
          ),
        }));
        notifyPrivateStoreChange();
      }
    },
    rollback: async (appId) => {
      const account = get().user?.id;
      if (!account) throw new Error("Sign in first.");
      const entry = await repository.rollback(account, appId);
      if (get().user?.id === account) {
        generation++;
        set((state) => ({
          installations: state.installations.map((old) =>
            old.app.id === appId ? entry : old,
          ),
          updateNotice:
            "Previous version restored. Automatic updates are off for this app. Saved data was kept.",
        }));
        notifyPrivateStoreChange();
      }
    },
    cancelInstall: () => {
      controller?.abort();
      controller = null;
      set({ downloading: null, pendingInstall: null, progress: 0 });
    },
    clearSession: () => {
      generation++;
      controller?.abort();
      controller = null;
      set({
        user: null,
        installations: [],
        brokenAppIds: [],
        pendingInstall: null,
        downloading: null,
        progress: 0,
        catalog: { apps: [], releases: [] },
        storeCatalog: emptyStoreCatalog(),
        updateNotice: "",
        reviewer: false,
        loading: false,
        error: "",
        catalogError: "",
      });
    },
    uninstall: async (appId, deleteData) => {
      const account = get().user?.id;
      if (!account) throw new Error("Sign in first.");
      await repository.uninstall(account, appId, deleteData);
      if (account === get().user?.id) {
        generation++;
        set((state) => ({
          installations: state.installations.filter(
            (entry) => entry.app.id !== appId,
          ),
          brokenAppIds: state.brokenAppIds.filter((id) => id !== appId),
        }));
        notifyPrivateStoreChange();
      }
    },
  }));
}
export const useInstalledAppsStore = createInstalledAppsStore();
