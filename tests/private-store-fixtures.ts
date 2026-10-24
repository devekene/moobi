import { SAMPLE_PACKAGE } from "@/lib/mini-app-sample";
import { packageDigest, parseMiniAppPackage } from "@/lib/mini-app-package";
import type { PrivateApp, PrivateRelease } from "@/lib/private-store-contract";
import { createCipher } from "@/lib/encrypted-storage";
import { createInstallationRepository } from "@/lib/mini-app-installations";

export const OWNER = "11111111-1111-4111-8111-111111111111";
export const MEMBER = "22222222-2222-4222-8222-222222222222";
export const OTHER = "33333333-3333-4333-8333-333333333333";
export const RELEASE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export async function releaseFixture() {
  const app: PrivateApp = {
    id: "example.counter",
    ownerId: OWNER,
    name: "Pocket Counter",
    description: "A private counter",
  };
  const parsed = parseMiniAppPackage(JSON.stringify(SAMPLE_PACKAGE));
  const source = JSON.stringify(parsed);
  const release: PrivateRelease = {
    id: RELEASE_ID,
    appId: app.id,
    version: parsed.manifest.version,
    digest: await packageDigest(parsed),
    byteSize: new TextEncoder().encode(source).byteLength,
    status: "published",
    createdAt: "2026-10-20T00:00:00.000Z",
  };
  return { app, release, source };
}
export async function repositoryFixture() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const cipher = createCipher(async () => key);
  const name = `moobi-test-${crypto.randomUUID()}`;
  const repository = createInstallationRepository(cipher, name);
  return { cipher, name, repository };
}

export async function updateFixture(
  permissions?: "storage"[],
  storageVersion?: number,
) {
  const first = await releaseFixture();
  const parsed = parseMiniAppPackage(first.source);
  const updated = parseMiniAppPackage(
    JSON.stringify({
      ...parsed,
      manifest: {
        ...parsed.manifest,
        version: "1.1.0",
        ...(permissions ? { permissions } : {}),
        ...(storageVersion ? { storageVersion } : {}),
      },
      files: {
        ...parsed.files,
        "app.js": `${parsed.files["app.js"]}\n// v1.1.0`,
      },
    }),
  );
  const source = JSON.stringify(updated);
  return {
    app: first.app,
    source,
    release: {
      ...first.release,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      version: "1.1.0",
      digest: await packageDigest(updated),
      byteSize: new TextEncoder().encode(source).byteLength,
    },
  };
}
