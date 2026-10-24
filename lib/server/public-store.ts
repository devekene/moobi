import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APP_ID, UUID } from "@/lib/private-store-contract";
import type { PrivateStoreDatabase } from "./private-store-database";
import { appMetadata, releaseMetadata } from "./private-store-metadata";
import { readObject, runtimeOrigin, StoreError } from "./private-store-http";

import { storedPackageResponse } from "./store-package";

type Client = SupabaseClient<PrivateStoreDatabase>;
export function isStoreReviewer(id: string) {
  return (process.env.MOOBI_STORE_REVIEWER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => UUID.test(value))
    .includes(id);
}
export function publicStoreReady() {
  if (process.env.MOOBI_PUBLIC_STORE_ENABLED !== "true")
    throw new StoreError(
      "Public Store is not enabled on this deployment.",
      503,
    );
  runtimeOrigin();
}
export async function releaseAvailable(client: Client, id: string) {
  const { data, error } = await client.rpc("store_release_available", {
    target_release: id,
  });
  if (error) {
    // Compatibility for deployments still on slice 2. Once the function exists,
    // moderation is always enforced, even when public discovery is switched off.
    if (
      process.env.MOOBI_PUBLIC_STORE_ENABLED !== "true" &&
      (error.code === "PGRST202" || error.code === "42883")
    ) {
      const legacy = await client
        .from("private_releases")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!legacy.error && legacy.data?.status === "published") return true;
    }
    throw new StoreError(
      "Could not verify app availability. Retry when connected.",
      503,
    );
  }
  return data === true;
}
export async function handlePublicStore(
  request: NextRequest,
  path: string[],
  client: Client,
  admin: Client,
  user: { id: string } | null,
): Promise<NextResponse | null> {
  if (path[0] !== "store") return null;
  if (
    path[1] === "releases" &&
    path[2] &&
    UUID.test(path[2]) &&
    path[3] === "availability" &&
    path.length === 4 &&
    request.method === "GET"
  ) {
    if (!user) throw new StoreError("Sign in to open installed apps.", 401);
    return NextResponse.json({
      available: await releaseAvailable(client, path[2]),
    });
  }
  publicStoreReady();
  const reviewer = user ? isStoreReviewer(user.id) : false;
  if (
    path.length === 2 &&
    request.method === "GET" &&
    ["catalog", "library", "reviews"].includes(path[1])
  ) {
    const mode = path[1];
    if (mode !== "catalog" && !user)
      throw new StoreError("Sign in to open your account library.", 401);
    if (mode === "reviews" && !reviewer)
      throw new StoreError("Reviewer access is required.", 403);
    const reader = mode === "reviews" ? admin : client;
    const [apps, releases, publications, controls, library, members] =
      await Promise.all([
        reader
          .from("private_apps")
          .select("*")
          .order("created_at", { ascending: false }),
        reader
          .from("private_releases")
          .select("*")
          .order("created_at", { ascending: false }),
        reader.from("store_publications").select("*"),
        reader.from("store_app_controls").select("*"),
        user
          ? client.from("private_library").select("*")
          : Promise.resolve({ data: [], error: null }),
        user
          ? client.from("private_app_members").select("*")
          : Promise.resolve({ data: [], error: null }),
      ]);
    if (
      apps.error ||
      releases.error ||
      publications.error ||
      controls.error ||
      library.error ||
      members.error
    )
      throw new StoreError(
        "Store catalog is unavailable. Apply the slice 3 migration and retry.",
        503,
      );
    const visiblePublications = publications.data ?? [];
    const suspended = new Set(
      (controls.data ?? [])
        .filter((entry) => entry.suspended)
        .map((entry) => entry.app_id),
    );
    const approved = new Set(
      visiblePublications
        .filter((entry) => entry.status === "approved")
        .map((entry) => entry.release_id),
    );
    const revoked = new Set(
      visiblePublications
        .filter((entry) => entry.status === "revoked")
        .map((entry) => entry.release_id),
    );
    const publicReleases = (releases.data ?? []).filter(
      (entry) =>
        entry.status === "published" &&
        approved.has(entry.id) &&
        !suspended.has(entry.app_id),
    );
    const publicApps = new Set(publicReleases.map((entry) => entry.app_id));
    const owned = new Set(
      (apps.data ?? [])
        .filter((entry) => entry.owner_id === user?.id)
        .map((entry) => entry.id),
    );
    const shared = new Set((members.data ?? []).map((entry) => entry.app_id));
    const acquired = new Set((library.data ?? []).map((entry) => entry.app_id));
    const submittedApps = new Set(
      (releases.data ?? [])
        .filter((release) =>
          visiblePublications.some((entry) => entry.release_id === release.id),
        )
        .map((release) => release.app_id),
    );
    const resultApps = (apps.data ?? []).filter((entry) =>
      mode === "reviews"
        ? submittedApps.has(entry.id)
        : mode === "catalog"
          ? publicApps.has(entry.id)
          : owned.has(entry.id) ||
            shared.has(entry.id) ||
            acquired.has(entry.id),
    );
    const ids = new Set(resultApps.map((entry) => entry.id));
    const resultReleases =
      mode === "catalog"
        ? publicReleases
        : (releases.data ?? []).filter(
            (entry) =>
              ids.has(entry.app_id) &&
              (mode !== "reviews" ||
                visiblePublications.some(
                  (publication) => publication.release_id === entry.id,
                )),
          );
    const releaseIds = new Set(resultReleases.map((entry) => entry.id));
    return NextResponse.json({
      apps: resultApps.map(appMetadata),
      releases: resultReleases.map(releaseMetadata),
      publications: visiblePublications
        .filter((entry) => releaseIds.has(entry.release_id))
        .map((entry) => ({
          releaseId: entry.release_id,
          status: entry.status,
          notes: entry.notes,
        })),
      controls: (controls.data ?? [])
        .filter((entry) => ids.has(entry.app_id))
        .map((entry) => ({
          appId: entry.app_id,
          suspended: entry.suspended,
          reason: entry.reason,
        })),
      libraryAppIds: [...acquired],
      availableReleaseIds: resultReleases
        .filter(
          (entry) =>
            entry.status === "published" &&
            !suspended.has(entry.app_id) &&
            !revoked.has(entry.id) &&
            (approved.has(entry.id) ||
              owned.has(entry.app_id) ||
              shared.has(entry.app_id)),
        )
        .map((entry) => entry.id),
    });
  }
  if (!user) throw new StoreError("Sign in to continue.", 401);
  if (
    path[1] === "releases" &&
    path[2] &&
    UUID.test(path[2]) &&
    path.length === 4 &&
    request.method === "POST"
  ) {
    const id = path[2];
    if (path[3] === "submit") {
      const { error } = await admin.rpc("submit_store_release", {
        target_release: id,
        actor: user.id,
      });
      if (error)
        throw new StoreError(
          "Only the owner can submit a published release without a final review decision. Suspended apps cannot submit.",
          409,
        );
      return NextResponse.json({ submitted: true });
    }
    if (path[3] === "review") {
      if (!reviewer) throw new StoreError("Reviewer access is required.", 403);
      const body = await readObject(request);
      if (
        (body.decision !== "approved" &&
          body.decision !== "rejected" &&
          body.decision !== "revoked") ||
        typeof body.notes !== "string" ||
        !body.notes.trim() ||
        body.notes.length > 1000
      )
        throw new StoreError(
          "Choose a decision and enter review notes (1–1,000 characters).",
        );
      const { error } = await admin.rpc("review_store_release", {
        target_release: id,
        actor: user.id,
        decision: body.decision,
        review_notes: body.notes.trim(),
      });
      if (error)
        throw new StoreError(
          "Review could not be applied. You cannot review your own release. Refresh the review queue.",
          409,
        );
      return NextResponse.json({ reviewed: true });
    }
  }
  if (
    path[1] === "apps" &&
    path[2] &&
    APP_ID.test(path[2]) &&
    path[3] === "moderate" &&
    path.length === 4 &&
    request.method === "POST"
  ) {
    if (!reviewer) throw new StoreError("Reviewer access is required.", 403);
    const body = await readObject(request);
    if (
      typeof body.suspended !== "boolean" ||
      typeof body.reason !== "string" ||
      !body.reason.trim() ||
      body.reason.length > 1000
    )
      throw new StoreError("Choose availability and provide a reason.");
    const { error } = await admin.from("store_app_controls").upsert({
      app_id: path[2],
      suspended: body.suspended,
      reason: body.reason.trim(),
    });
    if (error)
      throw new StoreError("Availability could not be changed. Retry.", 503);
    return NextResponse.json({ updated: true });
  }
  if (
    path[1] === "releases" &&
    path[2] &&
    UUID.test(path[2]) &&
    path[3] === "package" &&
    path.length === 4 &&
    request.method === "GET"
  ) {
    if (!reviewer) throw new StoreError("Reviewer access is required.", 403);
    const review = await admin
      .from("store_publications")
      .select("*")
      .eq("release_id", path[2])
      .maybeSingle();
    if (review.error || !review.data)
      throw new StoreError("Submission not found.", 404);
    const release = await admin
      .from("private_releases")
      .select("*")
      .eq("id", path[2])
      .maybeSingle();
    if (release.error || !release.data)
      throw new StoreError("Release not found.", 404);
    return storedPackageResponse(admin, release.data);
  }
  throw new StoreError("Store endpoint not found.", 404);
}
