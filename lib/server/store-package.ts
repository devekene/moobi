import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  MAX_PACKAGE_BYTES,
  packageDigest,
  parseMiniAppPackage,
} from "@/lib/mini-app-package";
import { PRIVATE_STORE_BUCKET } from "@/lib/private-store-contract";
import type {
  PrivateStoreDatabase,
  ReleaseRow,
} from "./private-store-database";
import { StoreError } from "./private-store-http";
export async function storedPackageResponse(
  admin: SupabaseClient<PrivateStoreDatabase>,
  release: ReleaseRow,
) {
  const { data, error } = await admin.storage
    .from(PRIVATE_STORE_BUCKET)
    .download(release.package_path);
  if (error || !data || data.size > MAX_PACKAGE_BYTES)
    throw new StoreError(
      "Package files are unavailable. Your installed version and data are kept.",
      503,
    );
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (
    bytes.byteLength !== release.byte_size ||
    bytes.byteLength > MAX_PACKAGE_BYTES
  )
    throw new StoreError("Stored package integrity check failed.", 503);
  const parsed = parseMiniAppPackage(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
  if (
    parsed.manifest.id !== release.app_id ||
    parsed.manifest.version !== release.version ||
    (await packageDigest(parsed)) !== release.digest
  )
    throw new StoreError("Stored package integrity check failed.", 503);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
