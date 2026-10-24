import { isRecord, type MiniAppPackage } from "@/lib/mini-app-package";
import { MAX_APP_VALUE_BYTES, validStorageKey } from "@/lib/mini-app-storage";

export const PREVIEW_CHANNEL = "moobi-preview-v1";
export type PreviewMethod =
  "ready" | "fault" | "storage.get" | "storage.set" | "storage.remove";
export interface PreviewRequest {
  channel: typeof PREVIEW_CHANNEL;
  session: string;
  id: number;
  method: PreviewMethod;
  key?: string;
  value?: string;
}

export function authenticatePreviewMessage(
  event: Pick<MessageEvent<unknown>, "source" | "origin" | "data">,
  frame: MessageEventSource | null,
  session: string,
): PreviewRequest | null {
  if (!frame || event.source !== frame || event.origin !== "null") return null;
  return parsePreviewRequest(event.data, session);
}

export function parsePreviewRequest(
  value: unknown,
  session: string,
): PreviewRequest | null {
  if (
    !isRecord(value) ||
    value.channel !== PREVIEW_CHANNEL ||
    value.session !== session ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    value.id < 1 ||
    value.id > 1_000_000 ||
    ![
      "ready",
      "fault",
      "storage.get",
      "storage.set",
      "storage.remove",
    ].includes(String(value.method))
  )
    return null;
  const keys = ["channel", "session", "id", "method"];
  if (value.method !== "ready" && value.method !== "fault") keys.push("key");
  if (value.method === "storage.set") keys.push("value");
  if (
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key))
  )
    return null;
  if (
    value.method !== "ready" &&
    value.method !== "fault" &&
    !validStorageKey(value.key)
  )
    return null;
  if (
    value.method === "storage.set" &&
    (typeof value.value !== "string" ||
      new TextEncoder().encode(value.value).byteLength > MAX_APP_VALUE_BYTES)
  )
    return null;
  return {
    channel: PREVIEW_CHANNEL,
    session,
    id: value.id,
    method:
      value.method === "ready"
        ? "ready"
        : value.method === "fault"
          ? "fault"
          : value.method === "storage.get"
            ? "storage.get"
            : value.method === "storage.set"
              ? "storage.set"
              : "storage.remove",
    ...(typeof value.key === "string" && { key: value.key }),
    ...(typeof value.value === "string" && { value: value.value }),
  };
}

type Storage = (
  id: string,
  operation: "get" | "set" | "remove",
  key: string,
  value?: string,
) => Promise<string | null>;

/** One bridge per frame: identity comes only from its validated host-owned package. */
export function createPreviewBridge(
  app: MiniAppPackage,
  session: string,
  storage: Storage,
) {
  let closed = false;
  let lastId = 0;
  let pending = false;
  let count = 0;
  let intervalStart = 0;
  return {
    close() {
      closed = true;
    },
    async receive(value: unknown, now = Date.now()) {
      if (closed) return null;
      const request = parsePreviewRequest(value, session);
      if (!request || request.id <= lastId) return null;
      lastId = request.id;
      if (now - intervalStart >= 1000) {
        intervalStart = now;
        count = 0;
      }
      const respond = (ok: boolean, result: string | null) =>
        closed
          ? null
          : {
              channel: PREVIEW_CHANNEL,
              session,
              id: request.id,
              ok,
              ...(ok ? { value: result } : { error: result }),
            };
      if (++count > 30 || pending)
        return respond(false, "Too many SDK requests. Retry shortly.");
      if (request.method === "ready" || request.method === "fault")
        return respond(true, null);
      if (!app.manifest.permissions.includes("storage"))
        return respond(false, "Storage permission was not granted.");
      pending = true;
      const operation =
        request.method === "storage.get"
          ? "get"
          : request.method === "storage.set"
            ? "set"
            : "remove";
      try {
        // Storage owns per-app serialization across sessions, including teardown races.
        const result = await storage(
          app.manifest.id,
          operation,
          request.key ?? "",
          request.value,
        );
        return respond(true, typeof result === "string" ? result : null);
      } catch {
        return respond(
          false,
          "Preview data could not be read or saved. Existing data was preserved; check storage access and quotas.",
        );
      } finally {
        pending = false;
      }
    },
  };
}
