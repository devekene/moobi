import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { createInstalledAppsStore } from "@/stores/useInstalledAppsStore";
import {
  OWNER,
  releaseFixture,
  repositoryFixture,
  updateFixture,
} from "./private-store-fixtures";
async function setup() {
  const { repository } = await repositoryFixture();
  const first = await releaseFixture();
  const next = await updateFixture();
  await repository.install(OWNER, first.app, first.release, first.source);
  let available = true;
  const request = vi.fn(async (path: string) => {
    if (path === "session")
      return {
        configured: true,
        user: { id: OWNER, email: "owner@example.test" },
        publishingEnabled: true,
        publicStoreEnabled: true,
        reviewer: false,
        runtimeOrigin: "https://runtime.example.test",
      };
    if (path === "store/library")
      return {
        apps: [first.app],
        releases: [first.release, next.release],
        publications: [],
        controls: [],
        libraryAppIds: [first.app.id],
        availableReleaseIds: [first.release.id, next.release.id],
      };
    if (path.endsWith("/availability")) return { available };
    return { app: next.app, release: next.release };
  });
  const download = vi.fn(async () => next.source);
  const store = createInstalledAppsStore(repository, request, download);
  await store.getState().refresh();
  return {
    repository,
    first,
    next,
    store,
    download,
    setAvailable: (value: boolean) => {
      available = value;
    },
  };
}
describe("Store update orchestration", () => {
  it("stages manual updates without changing the installed release until confirmation", async () => {
    const { store, first, next, repository } = await setup();
    await repository.storage(OWNER)(first.app.id, "set", "count", "9");
    await store.getState().prepareInstall(next.release, true);
    expect(store.getState().installations[0].release.id).toBe(first.release.id);
    expect(store.getState().pendingInstall?.expectedReleaseId).toBe(
      first.release.id,
    );
    await store.getState().confirmInstall();
    expect(store.getState().installations[0].release.id).toBe(next.release.id);
    expect(await repository.storage(OWNER)(first.app.id, "get", "count")).toBe(
      "9",
    );
    await store.getState().rollback(first.app.id);
    expect(store.getState().installations[0].release.id).toBe(first.release.id);
  });
  it("does not auto update by default; persisted opt-in applies only verified compatible releases", async () => {
    const { store, next, first, repository } = await setup();
    await store.getState().checkUpdates();
    expect(store.getState().installations[0].release.id).toBe(first.release.id);
    await store.getState().setAutoUpdate(first.app.id, true);
    await store.getState().checkUpdates();
    expect(store.getState().installations[0].release.id).toBe(next.release.id);
    expect((await repository.load(OWNER, first.app.id)).release.id).toBe(
      next.release.id,
    );
    expect(store.getState().pendingInstall).toBeNull();
  });
  it("serializes overlapping automatic checks so one check cannot cancel another", async () => {
    const { store, first, next, download } = await setup();
    await store.getState().setAutoUpdate(first.app.id, true);
    await Promise.all([
      store.getState().checkUpdates(),
      store.getState().checkUpdates(),
    ]);
    expect(download).toHaveBeenCalledOnce();
    expect(store.getState().installations[0].release.id).toBe(next.release.id);
  });
  it("rechecks revocation at commit and preserves the working release after rejection", async () => {
    const { store, next, first, setAvailable } = await setup();
    await store.getState().prepareInstall(next.release, true);
    setAvailable(false);
    await expect(store.getState().confirmInstall()).rejects.toThrow(
      "no longer available",
    );
    expect(store.getState().installations[0].release.id).toBe(first.release.id);
  });
  it("keeps a failed download recoverable and never advertises the update as installed", async () => {
    const { store, next, first, download } = await setup();
    download.mockRejectedValueOnce(new Error("interrupted"));
    await expect(
      store.getState().prepareInstall(next.release, true),
    ).rejects.toThrow("interrupted");
    expect(store.getState().installations[0].release.id).toBe(first.release.id);
    expect(store.getState().pendingInstall).toBeNull();
  });
  it("rejects account changes while update bytes are awaiting consent", async () => {
    const { store, next, first, repository } = await setup();
    await store.getState().prepareInstall(next.release, true);
    store.getState().clearSession();
    await expect(store.getState().confirmInstall()).rejects.toThrow(
      "signed in",
    );
    expect((await repository.load(OWNER, first.app.id)).release.id).toBe(
      first.release.id,
    );
  });
});
