import {
  isRecord,
  MAX_PACKAGE_BYTES,
  packageDigest,
  parseMiniAppPackage,
} from "@/lib/mini-app-package";
import {
  UUID,
  type PrivateRelease,
  type StoreAccount,
} from "@/lib/private-store-contract";

export interface PrivateSession {
  configured: boolean;
  user: StoreAccount | null;
  publishingEnabled: boolean;
  runtimeOrigin: string | null;
  publicStoreEnabled?: boolean;
  reviewer?: boolean;
}
export async function privateRequest(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(`/api/private-store/${path}`, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
  });
  const value: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      isRecord(value) && typeof value.error === "string"
        ? value.error
        : "Private store request failed. Retry.",
    );
  return value;
}
export function parsePrivateSession(value: unknown): PrivateSession {
  if (
    !isRecord(value) ||
    typeof value.configured !== "boolean" ||
    typeof value.publishingEnabled !== "boolean" ||
    !(value.runtimeOrigin === null || typeof value.runtimeOrigin === "string")
  )
    throw new Error("Invalid account response.");
  let user: StoreAccount | null = null;
  if (value.user !== null) {
    if (
      !isRecord(value.user) ||
      typeof value.user.id !== "string" ||
      !UUID.test(value.user.id) ||
      typeof value.user.email !== "string"
    )
      throw new Error("Invalid account response.");
    user = { id: value.user.id, email: value.user.email };
  }
  return {
    publicStoreEnabled: value.publicStoreEnabled === true,
    reviewer: value.reviewer === true,
    configured: value.configured,
    publishingEnabled: value.publishingEnabled,
    runtimeOrigin: value.runtimeOrigin,
    user,
  };
}
export async function downloadPrivateRelease(
  release: PrivateRelease,
  signal: AbortSignal,
  progress: (percent: number) => void,
  review = false,
): Promise<string> {
  const response = await fetch(
    `/api/private-store/${review ? "store/" : ""}releases/${release.id}/package`,
    { signal, credentials: "same-origin", cache: "no-store" },
  );
  if (!response.ok) {
    const error: unknown = await response.json();
    throw new Error(
      isRecord(error) && typeof error.error === "string"
        ? error.error
        : "Download failed. Retry.",
    );
  }
  if (!response.body)
    throw new Error("This browser could not download the package.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_PACKAGE_BYTES || size > release.byteSize) {
        await reader.cancel();
        throw new Error(
          "Downloaded package is larger than the release record.",
        );
      }
      chunks.push(chunk.value);
      progress(Math.floor((size / release.byteSize) * 100));
    }
  } finally {
    reader.releaseLock();
  }
  if (size !== release.byteSize)
    throw new Error("Download was interrupted. No app was installed.");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const parsed = parseMiniAppPackage(source);
  if (
    parsed.manifest.id !== release.appId ||
    parsed.manifest.version !== release.version ||
    (await packageDigest(parsed)) !== release.digest
  )
    throw new Error(
      "Downloaded package failed its integrity check. No app was installed.",
    );
  return source;
}
export function notifyPrivateStoreChange(kind: "auth" | "library" = "library") {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("moobi-private-store");
    channel.postMessage(kind);
    channel.close();
  }
}
