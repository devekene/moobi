import { isRecord } from "@/lib/mini-app-package";
import {
  APP_ID,
  UUID,
  parsePrivateCatalog,
  type PrivateCatalog,
  type PrivateRelease,
} from "@/lib/private-store-contract";

export type ReviewStatus = "pending" | "approved" | "rejected" | "revoked";
export interface Publication {
  releaseId: string;
  status: ReviewStatus;
  notes: string;
}
export interface AppControl {
  appId: string;
  suspended: boolean;
  reason: string;
}
export interface StoreCatalog extends PrivateCatalog {
  publications: Publication[];
  controls: AppControl[];
  libraryAppIds: string[];
  availableReleaseIds: string[];
}
export const emptyStoreCatalog = (): StoreCatalog => ({
  apps: [],
  releases: [],
  publications: [],
  controls: [],
  libraryAppIds: [],
  availableReleaseIds: [],
});
export function parseStoreCatalog(value: unknown): StoreCatalog {
  const catalog = parsePrivateCatalog(value);
  if (
    !isRecord(value) ||
    !Array.isArray(value.publications) ||
    !Array.isArray(value.controls) ||
    !Array.isArray(value.libraryAppIds) ||
    !Array.isArray(value.availableReleaseIds)
  )
    throw new Error("Invalid Store response.");
  return {
    ...catalog,
    publications: value.publications.map((entry: unknown): Publication => {
      if (
        !isRecord(entry) ||
        typeof entry.releaseId !== "string" ||
        !UUID.test(entry.releaseId) ||
        (entry.status !== "pending" &&
          entry.status !== "approved" &&
          entry.status !== "rejected" &&
          entry.status !== "revoked") ||
        typeof entry.notes !== "string" ||
        entry.notes.length > 1000
      )
        throw new Error("Invalid review response.");
      return {
        releaseId: entry.releaseId,
        status: entry.status,
        notes: entry.notes,
      };
    }),
    controls: value.controls.map((entry: unknown): AppControl => {
      if (
        !isRecord(entry) ||
        typeof entry.appId !== "string" ||
        !APP_ID.test(entry.appId) ||
        typeof entry.suspended !== "boolean" ||
        typeof entry.reason !== "string" ||
        entry.reason.length > 1000
      )
        throw new Error("Invalid availability response.");
      return {
        appId: entry.appId,
        suspended: entry.suspended,
        reason: entry.reason,
      };
    }),
    libraryAppIds: value.libraryAppIds.map((id: unknown) => {
      if (typeof id !== "string" || !APP_ID.test(id))
        throw new Error("Invalid account library.");
      return id;
    }),
    availableReleaseIds: value.availableReleaseIds.map((id: unknown) => {
      if (typeof id !== "string" || !UUID.test(id))
        throw new Error("Invalid release availability.");
      return id;
    }),
  };
}
export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number),
    right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const difference = left[i] - right[i];
    if (difference) return difference;
  }
  return 0;
}
export function newestRelease(
  releases: PrivateRelease[],
  appId: string,
): PrivateRelease | undefined {
  return releases
    .filter(
      (release) => release.appId === appId && release.status === "published",
    )
    .sort((a, b) => compareVersions(b.version, a.version))[0];
}
