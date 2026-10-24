import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { createInstalledAppsStore } from "@/stores/useInstalledAppsStore";
import {
  OWNER,
  MEMBER,
  releaseFixture,
  repositoryFixture,
} from "./private-store-fixtures";

describe("account-scoped installation state", () => {
  it("requires a verified download and explicit permission confirmation before exposing an icon", async () => {
    const { repository } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    const request = vi.fn(async (path: string) =>
      path === "session"
        ? {
            configured: true,
            user: { id: OWNER, email: "owner@example.test" },
            publishingEnabled: true,
            runtimeOrigin: "https://runtime.example.test",
          }
        : { app, release },
    );
    const download = vi.fn(async () => source);
    const store = createInstalledAppsStore(repository, request, download);
    await store.getState().refresh();
    await store.getState().prepareInstall(release);
    expect(store.getState().installations).toEqual([]);
    expect(store.getState().pendingInstall?.release.digest).toBe(
      release.digest,
    );
    await store.getState().confirmInstall();
    expect(store.getState().installations).toHaveLength(1);
    store.getState().cancelInstall();
    expect(download).toHaveBeenCalledOnce();
  });
  it("never exposes a failed or cancelled download as installed", async () => {
    const { repository } = await repositoryFixture();
    const { app, release } = await releaseFixture();
    const request = async (path: string) =>
      path === "session"
        ? {
            configured: true,
            user: { id: OWNER, email: "owner@example.test" },
            publishingEnabled: true,
            runtimeOrigin: "https://runtime.example.test",
          }
        : { app, release };
    const store = createInstalledAppsStore(repository, request, async () => {
      throw new Error("interrupted");
    });
    await store.getState().refresh();
    await expect(store.getState().prepareInstall(release)).rejects.toThrow(
      "interrupted",
    );
    expect(store.getState().installations).toEqual([]);
    expect(store.getState().pendingInstall).toBeNull();
    expect(store.getState().downloading).toBeNull();
  });
  it("drops installations and pending grants on signout/account switching and ignores stale completions", async () => {
    const { repository } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    let account: string | null = OWNER;
    let finish: (source: string) => void = () => {};
    const request = async (path: string) =>
      path === "session"
        ? {
            configured: true,
            user: account ? { id: account, email: "user@example.test" } : null,
            publishingEnabled: true,
            runtimeOrigin: "https://runtime.example.test",
          }
        : { app, release };
    const download = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const store = createInstalledAppsStore(repository, request, download);
    await store.getState().refresh();
    const downloading = store.getState().prepareInstall(release);
    await vi.waitFor(() => expect(download).toHaveBeenCalled());
    account = null;
    await store.getState().refresh();
    finish(source);
    await downloading;
    expect(store.getState().pendingInstall).toBeNull();
    expect(store.getState().installations).toEqual([]);
    account = MEMBER;
    await store.getState().refresh();
    expect(store.getState().user?.id).toBe(MEMBER);
    expect(store.getState().installations).toEqual([]);
    expect((await repository.list(OWNER)).installations).toEqual([]);
  });
  it("rejects a forged acquisition identity before downloading", async () => {
    const { repository } = await repositoryFixture();
    const { app, release } = await releaseFixture();
    const request = async (path: string) =>
      path === "session"
        ? {
            configured: true,
            user: { id: OWNER, email: "owner@example.test" },
            publishingEnabled: true,
            runtimeOrigin: "https://runtime.example.test",
          }
        : { app: { ...app, id: "another.app" }, release };
    const download = vi.fn(async () => "");
    const store = createInstalledAppsStore(repository, request, download);
    await store.getState().refresh();
    await expect(store.getState().prepareInstall(release)).rejects.toThrow(
      "Unexpected release",
    );
    expect(download).not.toHaveBeenCalled();
  });
  it("clears the active account immediately on successful signout while retaining its files", async () => {
    const { repository } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    await repository.install(OWNER, app, release, source);
    const request = async () => ({
      configured: true,
      user: { id: OWNER, email: "owner@example.test" },
      publishingEnabled: true,
      runtimeOrigin: "https://runtime.example.test",
    });
    const store = createInstalledAppsStore(repository, request);
    await store.getState().refresh();
    expect(store.getState().installations).toHaveLength(1);
    store.getState().clearSession();
    expect(store.getState().user).toBeNull();
    expect(store.getState().installations).toEqual([]);
    expect((await repository.list(OWNER)).installations).toHaveLength(1);
  });
});
