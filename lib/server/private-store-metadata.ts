import type { AppRow, ReleaseRow } from "./private-store-database";
import type { PrivateApp, PrivateRelease } from "@/lib/private-store-contract";

export const appMetadata = (row: AppRow): PrivateApp => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  description: row.description,
});
export const releaseMetadata = (row: ReleaseRow): PrivateRelease => ({
  id: row.id,
  appId: row.app_id,
  version: row.version,
  digest: row.digest,
  byteSize: row.byte_size,
  status: row.status,
  createdAt: row.created_at,
});
