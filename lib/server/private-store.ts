import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  APP_ID,
  PRIVATE_STORE_BUCKET,
  UUID,
} from "@/lib/private-store-contract";
import {
  MAX_PACKAGE_BYTES,
  packageDigest,
  parseMiniAppPackage,
} from "@/lib/mini-app-package";
import { readMiniAppZip, MAX_ZIP_BYTES } from "@/lib/server/mini-app-zip";
import {
  limitedBody,
  readObject,
  runtimeOrigin,
  sameOriginMutation,
  StoreError,
} from "@/lib/server/private-store-http";
import type { PrivateStoreDatabase } from "@/lib/server/private-store-database";
import { appMetadata, releaseMetadata } from "./private-store-metadata";
import { storedPackageResponse } from "./store-package";
import {
  handlePublicStore,
  isStoreReviewer,
  releaseAvailable,
} from "./public-store";

function configuration() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  return url && key && secret ? { url, key, secret } : null;
}
function publishingReady() {
  if (process.env.MOOBI_PRIVATE_PUBLISHING_ENABLED !== "true")
    throw new StoreError(
      "Private publishing is not enabled on this Moobi deployment.",
      503,
    );
  runtimeOrigin();
}

export async function handlePrivateStore(request: NextRequest, path: string[]) {
  const changes: { name: string; value: string; options: CookieOptions }[] = [];
  const finish = (response: NextResponse) => {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    for (const cookie of changes)
      response.cookies.set(cookie.name, cookie.value, {
        ...cookie.options,
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV === "production" ||
          request.nextUrl.protocol === "https:",
      });
    return response;
  };
  try {
    if (request.method === "POST") sameOriginMutation(request);
    const config = configuration();
    if (!config) {
      if (request.method === "GET" && path.join("/") === "session")
        return finish(
          NextResponse.json({
            configured: false,
            user: null,
            publishingEnabled: false,
            runtimeOrigin: null,
          }),
        );
      throw new StoreError(
        "Private publishing needs Supabase configuration. See docs/private-app-store.md.",
        503,
      );
    }
    const client = createServerClient<PrivateStoreDatabase>(
      config.url,
      config.key,
      {
        cookieOptions: {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          secure:
            process.env.NODE_ENV === "production" ||
            request.nextUrl.protocol === "https:",
        },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) => {
            for (const cookie of cookies) {
              changes.push(cookie);
              request.cookies.set(cookie.name, cookie.value);
            }
          },
        },
      },
    );
    if (path.join("/") === "confirm" && request.method === "GET") {
      const code = request.nextUrl.searchParams.get("code");
      if (!code || code.length > 2048)
        throw new StoreError(
          "Email confirmation link is invalid. Sign in again or request a new confirmation email.",
        );
      const { error } = await client.auth.exchangeCodeForSession(code);
      const destination = new URL(
        "/",
        process.env.MOOBI_APP_ORIGIN || request.nextUrl.origin,
      );
      destination.searchParams.set(
        "auth",
        error ? "confirmation-failed" : "confirmed",
      );
      return finish(NextResponse.redirect(destination));
    }
    if (path.join("/") === "session" && request.method === "POST") {
      const body = await readObject(request);
      if (body.action === "signout") {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error)
          throw new StoreError(
            "Could not sign out. Retry before leaving this browser.",
            503,
          );
        return finish(NextResponse.json({ user: null }));
      }
      if (
        (body.action !== "signin" && body.action !== "signup") ||
        typeof body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
        body.email.length > 254 ||
        typeof body.password !== "string" ||
        body.password.length < 12 ||
        body.password.length > 128
      )
        throw new StoreError(
          "Enter a valid email and a password of 12–128 characters.",
        );
      const credentials = {
        email: body.email.trim().toLowerCase(),
        password: body.password,
      };
      const result =
        body.action === "signup"
          ? await client.auth.signUp({
              ...credentials,
              options: {
                emailRedirectTo: new URL(
                  "/api/private-store/confirm",
                  process.env.MOOBI_APP_ORIGIN || request.nextUrl.origin,
                ).href,
              },
            })
          : await client.auth.signInWithPassword(credentials);
      if (result.error)
        throw new StoreError(
          body.action === "signin"
            ? "Could not sign in. Check your credentials and email confirmation."
            : "Could not create the account. Check your email or try again later.",
          400,
        );
      return finish(
        NextResponse.json({ confirmationRequired: !result.data.session }),
      );
    }
    const auth = await client.auth.getUser();
    if (
      auth.error &&
      (auth.error.status === undefined ||
        auth.error.status === 0 ||
        auth.error.status >= 500)
    )
      throw new StoreError(
        "Account service is unavailable. Retry when connected.",
        503,
      );
    const user = auth.data.user;
    if (request.method === "GET" && path.join("/") === "session") {
      let runtime: string | null = null;
      try {
        runtime = runtimeOrigin();
      } catch {
        /* Explained by publishing status. */
      }
      return finish(
        NextResponse.json({
          configured: true,
          user: user ? { id: user.id, email: user.email ?? "" } : null,
          publishingEnabled:
            process.env.MOOBI_PRIVATE_PUBLISHING_ENABLED === "true" &&
            Boolean(runtime),
          runtimeOrigin: runtime,
          publicStoreEnabled:
            process.env.MOOBI_PUBLIC_STORE_ENABLED === "true" &&
            Boolean(runtime),
          reviewer: user ? isStoreReviewer(user.id) : false,
        }),
      );
    }
    // Never expose or use this privileged client in the browser. All writes below
    // follow authenticated RLS reads and explicit owner/access checks.
    const admin = createClient<PrivateStoreDatabase>(
      config.url,
      config.secret,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const publicResponse = await handlePublicStore(
      request,
      path,
      client,
      admin,
      user,
    );
    if (publicResponse) return finish(publicResponse);
    if (!user || !UUID.test(user.id))
      throw new StoreError("Sign in to access private apps.", 401);
    const getApp = async (id: string, owner = false) => {
      if (!APP_ID.test(id)) throw new StoreError("App not found.", 404);
      const { data, error } = await client
        .from("private_apps")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error)
        throw new StoreError(
          "Private catalog is unavailable. Check the database migration.",
          503,
        );
      if (!data || (owner && data.owner_id !== user.id))
        throw new StoreError("App not found or access was not granted.", 404);
      return data;
    };
    const getRelease = async (id: string) => {
      if (!UUID.test(id)) throw new StoreError("Release not found.", 404);
      const { data, error } = await client
        .from("private_releases")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new StoreError("Release service is unavailable.", 503);
      if (!data)
        throw new StoreError(
          "Release not found or access was not granted.",
          404,
        );
      await getApp(data.app_id);
      return data;
    };
    if (path.join("/") === "catalog" && request.method === "GET") {
      const [apps, releases, library, members] = await Promise.all([
        client
          .from("private_apps")
          .select("*")
          .order("created_at", { ascending: false }),
        client
          .from("private_releases")
          .select("*")
          .order("created_at", { ascending: false }),
        client.from("private_library").select("*"),
        client.from("private_app_members").select("*"),
      ]);
      if (apps.error || releases.error || library.error || members.error)
        throw new StoreError(
          "Private catalog is unavailable. Apply the Supabase migration and retry.",
          503,
        );
      const libraryIds = new Set(
        (library.data ?? []).map((entry) => entry.app_id),
      );
      const memberIds = new Set(
        (members.data ?? []).map((entry) => entry.app_id),
      );
      const entries = apps.data.filter(
        (app) =>
          app.owner_id === user.id ||
          libraryIds.has(app.id) ||
          memberIds.has(app.id),
      );
      const ids = new Set(entries.map((app) => app.id));
      return finish(
        NextResponse.json({
          apps: entries.map(appMetadata),
          releases: releases.data
            .filter((release) => ids.has(release.app_id))
            .map(releaseMetadata),
        }),
      );
    }
    if (path.join("/") === "apps" && request.method === "POST") {
      publishingReady();
      const body = await readObject(request);
      if (
        typeof body.id !== "string" ||
        !APP_ID.test(body.id) ||
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.length > 60 ||
        typeof body.description !== "string" ||
        body.description.length > 1000
      )
        throw new StoreError(
          "Enter a valid app ID, name, and description (up to 1,000 characters).",
        );
      const { data, error } = await admin
        .from("private_apps")
        .insert({
          id: body.id,
          owner_id: user.id,
          name: body.name.trim(),
          description: body.description,
        })
        .select("*")
        .single();
      if (error || !data)
        throw new StoreError(
          "That app ID is unavailable, or the app could not be created.",
          409,
        );
      return finish(
        NextResponse.json({ app: appMetadata(data) }, { status: 201 }),
      );
    }
    if (
      path[0] === "apps" &&
      path[1] &&
      path[2] === "invite" &&
      path.length === 3 &&
      request.method === "POST"
    ) {
      publishingReady();
      await getApp(path[1], true);
      const body = await readObject(request);
      if (
        typeof body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
        body.email.length > 254
      )
        throw new StoreError("Enter the recipient's confirmed account email.");
      const { error } = await admin.rpc("grant_private_app", {
        target_app: path[1],
        member_email: body.email.trim().toLowerCase(),
      });
      if (error)
        throw new StoreError(
          "Access could not be granted. The recipient needs a confirmed Moobi account first.",
        );
      return finish(NextResponse.json({ granted: true }));
    }
    if (
      path[0] === "apps" &&
      path[1] &&
      path[2] === "releases" &&
      path.length === 3 &&
      request.method === "POST"
    ) {
      publishingReady();
      const app = await getApp(path[1], true);
      const contentType = request.headers.get("content-type")?.split(";")[0];
      let parsed;
      try {
        if (contentType === "application/zip")
          parsed = await readMiniAppZip(
            await limitedBody(request, MAX_ZIP_BYTES),
          );
        else if (contentType === "application/json")
          parsed = parseMiniAppPackage(
            new TextDecoder("utf-8", { fatal: true }).decode(
              await limitedBody(request, MAX_PACKAGE_BYTES),
            ),
          );
        else throw new StoreError("Upload a ZIP or Moobi JSON package.", 415);
      } catch (error) {
        throw error instanceof StoreError
          ? error
          : new StoreError(
              error instanceof Error ? error.message : "Invalid package.",
            );
      }
      if (parsed.manifest.id !== app.id)
        throw new StoreError("Package app ID must match the app you own.");
      const digest = await packageDigest(parsed);
      const source = JSON.stringify(parsed);
      const previous = await admin
        .from("private_releases")
        .select("*")
        .eq("app_id", app.id)
        .eq("version", parsed.manifest.version)
        .maybeSingle();
      if (previous.error)
        throw new StoreError("Release lookup failed. Retry.", 503);
      if (previous.data) {
        if (previous.data.digest !== digest)
          throw new StoreError(
            "This version already has different files. Publish a new version number.",
            409,
          );
        return finish(
          NextResponse.json({ release: releaseMetadata(previous.data) }),
        );
      }
      const packagePath = `${user.id}/${app.id}/${parsed.manifest.version}/${digest}.json`;
      const upload = await admin.storage
        .from(PRIVATE_STORE_BUCKET)
        .upload(packagePath, source, {
          contentType: "application/json",
          upsert: false,
        });
      if (upload.error && upload.error.statusCode !== "409")
        throw new StoreError(
          "Package storage is unavailable. Nothing was published.",
          503,
        );
      const inserted = await admin
        .from("private_releases")
        .insert({
          app_id: app.id,
          version: parsed.manifest.version,
          digest,
          byte_size: new TextEncoder().encode(source).byteLength,
          package_path: packagePath,
          status: "draft",
        })
        .select("*")
        .single();
      if (inserted.error || !inserted.data) {
        // A concurrent upload/retry can win the unique (app, version) race.
        const existing = await admin
          .from("private_releases")
          .select("*")
          .eq("app_id", app.id)
          .eq("version", parsed.manifest.version)
          .maybeSingle();
        if (existing.data?.digest === digest)
          return finish(
            NextResponse.json({ release: releaseMetadata(existing.data) }),
          );
        throw new StoreError(
          "Version conflict or release could not be saved. Retry the same files; do not change this version's bytes.",
          409,
        );
      }
      return finish(
        NextResponse.json(
          { release: releaseMetadata(inserted.data) },
          { status: 201 },
        ),
      );
    }
    if (path[0] === "releases" && path[1] && path.length === 3) {
      const release = await getRelease(path[1]);
      const app = await getApp(release.app_id);
      if (path[2] === "publish" && request.method === "POST") {
        publishingReady();
        await getApp(release.app_id, true);
        const { data, error } = await admin
          .from("private_releases")
          .update({ status: "published" })
          .eq("id", release.id)
          .select("*")
          .single();
        if (error || !data)
          throw new StoreError("Could not publish this release. Retry.", 503);
        return finish(NextResponse.json({ release: releaseMetadata(data) }));
      }
      if (
        (path[2] === "acquire" && request.method === "POST") ||
        (path[2] === "package" &&
          request.method === "GET" &&
          release.status === "published")
      ) {
        if (!(await releaseAvailable(client, release.id)))
          throw new StoreError(
            "This release is suspended, revoked, or no longer available to your account. Saved data is kept.",
            403,
          );
      }
      if (path[2] === "acquire" && request.method === "POST") {
        publishingReady();
        if (release.status !== "published")
          throw new StoreError("This release has not been published.", 409);
        const { error } = await admin
          .from("private_library")
          .upsert(
            { user_id: user.id, app_id: release.app_id },
            { onConflict: "user_id,app_id", ignoreDuplicates: true },
          );
        if (error)
          throw new StoreError(
            "Could not add the app to your library. Retry.",
            503,
          );
        return finish(
          NextResponse.json({
            app: appMetadata(app),
            release: releaseMetadata(release),
          }),
        );
      }
      if (path[2] === "package" && request.method === "GET") {
        return finish(await storedPackageResponse(admin, release));
      }
    }
    throw new StoreError("Private store endpoint not found.", 404);
  } catch (error) {
    return finish(
      NextResponse.json(
        {
          error:
            error instanceof StoreError
              ? error.message
              : "Private store service is unavailable. Retry.",
        },
        { status: error instanceof StoreError ? error.status : 503 },
      ),
    );
  }
}
