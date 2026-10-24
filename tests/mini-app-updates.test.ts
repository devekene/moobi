import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { createInstallationRepository } from "@/lib/mini-app-installations";
import { parseMiniAppPackage, packageDigest } from "@/lib/mini-app-package";
import { compareVersions, newestRelease } from "@/lib/store-catalog";
import {
  OWNER,
  releaseFixture,
  repositoryFixture,
  updateFixture,
} from "./private-store-fixtures";
describe("atomic update and recovery", () => {
  it("uses numeric semver order, never upload time or lexical order", async () => {
    expect(compareVersions("1.10.0", "1.9.99")).toBeGreaterThan(0);
    const { release } = await releaseFixture();
    expect(
      newestRelease(
        [
          release,
          { ...release, version: "1.10.0" },
          { ...release, version: "1.9.0" },
        ],
        release.appId,
      )?.version,
    ).toBe("1.10.0");
  });
  it("commits verified new files with metadata, keeps data and one recovery copy across reopen", async () => {
    const { repository, cipher, name } = await repositoryFixture();
    const first = await releaseFixture();
    const next = await updateFixture();
    await repository.install(OWNER, first.app, first.release, first.source);
    await repository.storage(OWNER)(first.app.id, "set", "count", "7");
    await repository.update(
      OWNER,
      next.app,
      next.release,
      next.source,
      first.release.id,
    );
    const reopened = createInstallationRepository(cipher, name);
    expect((await reopened.load(OWNER, first.app.id)).release.version).toBe(
      "1.1.0",
    );
    expect(await reopened.storage(OWNER)(first.app.id, "get", "count")).toBe(
      "7",
    );
    const restored = await reopened.rollback(OWNER, first.app.id);
    expect(restored.release.version).toBe("1.0.0");
    expect(restored.autoUpdate).toBe(false);
    expect(await reopened.storage(OWNER)(first.app.id, "get", "count")).toBe(
      "7",
    );
    await expect(reopened.rollback(OWNER, first.app.id)).rejects.toThrow(
      "No recovery",
    );
  });
  it("retains current package and data after corruption, downgrade or stale-tab update", async () => {
    const { repository } = await repositoryFixture();
    const first = await releaseFixture();
    const next = await updateFixture();
    await repository.install(OWNER, first.app, first.release, first.source);
    await expect(
      repository.update(
        OWNER,
        next.app,
        { ...next.release, digest: "f".repeat(64) },
        next.source,
        first.release.id,
      ),
    ).rejects.toThrow("integrity");
    await expect(
      repository.update(
        OWNER,
        first.app,
        first.release,
        first.source,
        first.release.id,
      ),
    ).rejects.toThrow("newer");
    await expect(
      repository.update(
        OWNER,
        next.app,
        next.release,
        next.source,
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ),
    ).rejects.toThrow("another tab");
    expect((await repository.load(OWNER, first.app.id)).release.id).toBe(
      first.release.id,
    );
  });
  it("serializes concurrent updates and rejects the stale installed-version expectation", async () => {
    const { repository } = await repositoryFixture();
    const first = await releaseFixture();
    const next = await updateFixture();
    await repository.install(OWNER, first.app, first.release, first.source);
    const results = await Promise.allSettled([
      repository.update(
        OWNER,
        next.app,
        next.release,
        next.source,
        first.release.id,
      ),
      repository.update(
        OWNER,
        next.app,
        next.release,
        next.source,
        first.release.id,
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect((await repository.load(OWNER, first.app.id)).release.id).toBe(
      next.release.id,
    );
  });
  it("retains the old installation if encryption or storage fails", async () => {
    const { repository, cipher, name } = await repositoryFixture();
    const first = await releaseFixture();
    const next = await updateFixture();
    await repository.install(OWNER, first.app, first.release, first.source);
    const failing = createInstallationRepository(
      {
        ...cipher,
        encrypt: async () => {
          throw new Error("quota");
        },
      },
      name,
    );
    await expect(
      failing.update(
        OWNER,
        next.app,
        next.release,
        next.source,
        first.release.id,
      ),
    ).rejects.toThrow("quota");
    expect((await repository.load(OWNER, first.app.id)).release.id).toBe(
      first.release.id,
    );
  });
  it("preserves the installed bytes when IndexedDB rejects the update write", async () => {
    const { repository } = await repositoryFixture();
    const first = await releaseFixture();
    const next = await updateFixture();
    await repository.install(OWNER, first.app, first.release, first.source);
    const failure = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementationOnce(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });
    try {
      await expect(
        repository.update(
          OWNER,
          next.app,
          next.release,
          next.source,
          first.release.id,
        ),
      ).rejects.toThrow("Quota");
    } finally {
      failure.mockRestore();
    }
    expect((await repository.load(OWNER, first.app.id)).release.id).toBe(
      first.release.id,
    );
  });
  it("requires persisted opt-in for automatic updates and rejects added permissions", async () => {
    const { repository } = await repositoryFixture();
    const first = await releaseFixture();
    const next = await updateFixture();
    const noPermissions = parseMiniAppPackage(first.source);
    noPermissions.manifest.permissions = [];
    const source = JSON.stringify(noPermissions);
    const release = {
      ...first.release,
      digest: await packageDigest(noPermissions),
      byteSize: new TextEncoder().encode(source).byteLength,
    };
    await repository.install(OWNER, first.app, release, source);
    await expect(
      repository.update(
        OWNER,
        next.app,
        next.release,
        next.source,
        release.id,
        true,
      ),
    ).rejects.toThrow("permission confirmation");
    await repository.setAutoUpdate(OWNER, first.app.id, true);
    await expect(
      repository.update(
        OWNER,
        next.app,
        next.release,
        next.source,
        release.id,
        true,
      ),
    ).rejects.toThrow("permission confirmation");
    await repository.update(
      OWNER,
      next.app,
      next.release,
      next.source,
      release.id,
      false,
    );
    expect((await repository.load(OWNER, first.app.id)).autoUpdate).toBe(true);
  });
  it("blocks unsupported data migrations without changing saved data", async () => {
    const { repository } = await repositoryFixture();
    const first = await releaseFixture();
    const next = await updateFixture(undefined, 2);
    await repository.install(OWNER, first.app, first.release, first.source);
    await repository.storage(OWNER)(first.app.id, "set", "count", "8");
    await expect(
      repository.update(
        OWNER,
        next.app,
        next.release,
        next.source,
        first.release.id,
      ),
    ).rejects.toThrow("migration");
    expect((await repository.load(OWNER, first.app.id)).release.version).toBe(
      "1.0.0",
    );
    expect(await repository.storage(OWNER)(first.app.id, "get", "count")).toBe(
      "8",
    );
  });
});
