import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { getPhoneApps, externalAppId } from "@/lib/phone-apps";
import {
  getAppLibraryCategoryApps,
  getAlphabeticalAppGroups,
} from "@/lib/app-library";
import { createInstallationRepository } from "@/lib/mini-app-installations";
import { usePhoneStore } from "@/stores/usePhoneStore";
import {
  OWNER,
  MEMBER,
  releaseFixture,
  repositoryFixture,
} from "./private-store-fixtures";

describe("verified installation lifecycle", () => {
  it("atomically persists a package and metadata, survives a new repository, and resolves through launcher/library", async () => {
    const { repository, name, cipher } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    expect((await repository.list(OWNER)).installations).toEqual([]);
    await repository.install(OWNER, app, release, source);
    const reopened = createInstallationRepository(cipher, name);
    const snapshot = await reopened.list(OWNER);
    expect(snapshot.installations).toHaveLength(1);
    expect((await reopened.load(OWNER, app.id)).release.digest).toBe(
      release.digest,
    );
    const apps = getPhoneApps(snapshot.installations);
    expect(
      apps.find((entry) => entry.id === externalAppId(app.id))?.launchTarget
        .kind,
    ).toBe("installed-app");
    expect(
      getAppLibraryCategoryApps("recently-added", "Pocket", apps).map(
        (entry) => entry.id,
      ),
    ).toContain(externalAppId(app.id));
    expect(getAlphabeticalAppGroups("Pocket", apps)[0]?.apps[0]?.name).toBe(
      app.name,
    );
    usePhoneStore.getState().setCurrentScreen(externalAppId(app.id));
    expect(usePhoneStore.getState().history).toContain(externalAppId(app.id));
    usePhoneStore.getState().closeApp(externalAppId(app.id));
    expect(usePhoneStore.getState().currentScreen).toBe("home");
    expect((await repository.list(MEMBER)).installations).toEqual([]);
  });
  it("rejects tampered, truncated, draft, or mismatched packages without creating an installation", async () => {
    const { repository } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    await expect(
      repository.install(
        OWNER,
        app,
        { ...release, digest: "0".repeat(64) },
        source,
      ),
    ).rejects.toThrow("does not match");
    await expect(
      repository.install(OWNER, app, release, source.slice(0, -3)),
    ).rejects.toThrow();
    await expect(
      repository.install(OWNER, app, { ...release, status: "draft" }, source),
    ).rejects.toThrow();
    await expect(
      repository.install(
        OWNER,
        app,
        { ...release, byteSize: release.byteSize + 1 },
        source,
      ),
    ).rejects.toThrow();
    expect((await repository.list(OWNER)).installations).toEqual([]);
  });
  it("is idempotent for the same release and does not overwrite an installed version", async () => {
    const { repository } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    const first = await repository.install(OWNER, app, release, source);
    expect(await repository.install(OWNER, app, release, source)).toEqual(
      first,
    );
    await expect(
      repository.install(
        OWNER,
        app,
        { ...release, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        source,
      ),
    ).rejects.toThrow("Another version");
    expect((await repository.list(OWNER)).installations).toHaveLength(1);
  });
  it("retains app data by default, deletes it only when selected, and isolates account and preview namespaces", async () => {
    const { repository } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    await repository.install(OWNER, app, release, source);
    await repository.storage(OWNER)(app.id, "set", "count", "7");
    expect(await repository.storage(MEMBER)(app.id, "get", "count")).toBeNull();
    await repository.uninstall(OWNER, app.id, false);
    expect((await repository.list(OWNER)).installations).toEqual([]);
    await repository.install(OWNER, app, release, source);
    expect(await repository.storage(OWNER)(app.id, "get", "count")).toBe("7");
    await repository.uninstall(OWNER, app.id, true);
    expect(await repository.storage(OWNER)(app.id, "get", "count")).toBeNull();
  });
  it("does not report successful installation after encryption/storage failure", async () => {
    const { cipher, name, repository } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    const failing = createInstallationRepository(
      {
        ...cipher,
        encrypt: async () => {
          throw new Error("quota");
        },
      },
      name,
    );
    await expect(failing.install(OWNER, app, release, source)).rejects.toThrow(
      "quota",
    );
    expect((await repository.list(OWNER)).installations).toEqual([]);
  });
  it("keeps unreadable records for explicit repair instead of silently resetting them", async () => {
    const { name, repository } = await repositoryFixture();
    const { app, release, source } = await releaseFixture();
    await repository.install(OWNER, app, release, source);
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open(name, 1);
      req.onsuccess = () => resolve(req.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("installations", "readwrite");
      tx.objectStore("installations").put("broken", `${OWNER}:${app.id}`);
      tx.oncomplete = () => resolve();
    });
    db.close();
    expect(await repository.list(OWNER)).toEqual({
      installations: [],
      brokenAppIds: [app.id],
    });
    await expect(
      repository.install(OWNER, app, release, source),
    ).rejects.toThrow();
    await repository.uninstall(OWNER, app.id, false);
    await repository.install(OWNER, app, release, source);
    expect((await repository.list(OWNER)).installations).toHaveLength(1);
  });
});
