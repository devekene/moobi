import type { NextRequest } from "next/server";
import { isRecord } from "@/lib/mini-app-package";

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
export async function limitedBody(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit))
    throw new StoreError("Upload is too large.", 413);
  if (!request.body) throw new StoreError("A request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new StoreError("Upload is too large.", 413);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
export async function readObject(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await limitedBody(request, 16384),
      ),
    );
    if (!isRecord(value)) throw new StoreError("Invalid request.");
    return value;
  } catch (error) {
    if (error instanceof StoreError) throw error;
    throw new StoreError("Invalid JSON request.");
  }
}
export function sameOriginMutation(request: NextRequest) {
  const expected = process.env.MOOBI_APP_ORIGIN || request.nextUrl.origin;
  if (
    request.headers.get("origin") !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new StoreError("This action must be requested from Moobi.", 403);
}
export function runtimeOrigin() {
  const raw = process.env.NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN;
  if (!raw)
    throw new StoreError(
      "Private apps need the separate runtime service configured first.",
      503,
    );
  const runtime = new URL(raw);
  const host = process.env.MOOBI_APP_ORIGIN;
  if (
    !host ||
    runtime.origin === new URL(host).origin ||
    runtime.hostname === new URL(host).hostname ||
    !["http:", "https:"].includes(runtime.protocol) ||
    runtime.username ||
    runtime.password ||
    runtime.pathname !== "/" ||
    runtime.search ||
    runtime.hash ||
    (process.env.NODE_ENV === "production" &&
      (runtime.protocol !== "https:" || new URL(host).protocol !== "https:"))
  )
    throw new StoreError(
      "Configure separate app and runtime hostnames. Production requires HTTPS; use localhost and 127.0.0.1 for development.",
      503,
    );
  return runtime.origin;
}
