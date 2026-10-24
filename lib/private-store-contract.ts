import { isRecord } from "@/lib/mini-app-package";

export const PRIVATE_STORE_BUCKET = "private-app-releases";
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const APP_ID = /^[a-z][a-z0-9.-]{2,63}$/;
export interface StoreAccount {
  id: string;
  email: string;
}
export interface PrivateApp {
  id: string;
  ownerId: string;
  name: string;
  description: string;
}
export interface PrivateRelease {
  id: string;
  appId: string;
  version: string;
  digest: string;
  byteSize: number;
  status: "draft" | "published";
  createdAt: string;
}
export interface PrivateCatalog {
  apps: PrivateApp[];
  releases: PrivateRelease[];
}

export function parsePrivateApp(value: unknown): PrivateApp {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !APP_ID.test(value.id) ||
    typeof value.ownerId !== "string" ||
    !UUID.test(value.ownerId) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 60 ||
    typeof value.description !== "string" ||
    value.description.length > 1000
  )
    throw new Error("Invalid app metadata.");
  return {
    id: value.id,
    ownerId: value.ownerId,
    name: value.name,
    description: value.description,
  };
}
export function parsePrivateRelease(value: unknown): PrivateRelease {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !UUID.test(value.id) ||
    typeof value.appId !== "string" ||
    !APP_ID.test(value.appId) ||
    typeof value.version !== "string" ||
    !/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(
      value.version,
    ) ||
    typeof value.digest !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.digest) ||
    typeof value.byteSize !== "number" ||
    !Number.isSafeInteger(value.byteSize) ||
    value.byteSize < 1 ||
    value.byteSize > 262144 ||
    (value.status !== "draft" && value.status !== "published") ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt))
  )
    throw new Error("Invalid release metadata.");
  return {
    id: value.id,
    appId: value.appId,
    version: value.version,
    digest: value.digest,
    byteSize: value.byteSize,
    status: value.status,
    createdAt: value.createdAt,
  };
}
export function parsePrivateCatalog(value: unknown): PrivateCatalog {
  if (
    !isRecord(value) ||
    !Array.isArray(value.apps) ||
    !Array.isArray(value.releases)
  )
    throw new Error("Invalid private catalog response.");
  return {
    apps: value.apps.map(parsePrivateApp),
    releases: value.releases.map(parsePrivateRelease),
  };
}
