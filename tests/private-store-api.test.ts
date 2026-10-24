import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { handlePrivateStore } from "@/lib/server/private-store";
import {
  MEMBER,
  OWNER,
  RELEASE_ID,
  releaseFixture,
} from "./private-store-fixtures";

interface Result {
  data: unknown;
  error: { message: string } | null;
}
interface MockState {
  user: { id: string; email: string } | null;
  clientResults: Result[];
  adminResults: Result[];
  writes: { table: string; method: string; value: unknown }[];
  uploads: { path: string; source: string; options: unknown }[];
  cookies: { name: string; value: string; options: CookieOptions }[];
  availability: boolean;
  rpcCalls: { name: string; args: unknown }[];
}
const state = vi.hoisted((): MockState => ({
  user: null,
  clientResults: [],
  adminResults: [],
  writes: [],
  uploads: [],
  cookies: [],
  availability: true,
  rpcCalls: [],
}));
function query(table: string, result: Result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    insert: (value: unknown) => {
      state.writes.push({ table, method: "insert", value });
      return chain;
    },
    update: (value: unknown) => {
      state.writes.push({ table, method: "update", value });
      return chain;
    },
    upsert: (value: unknown) => {
      state.writes.push({ table, method: "upsert", value });
      return chain;
    },
    single: async () => result,
    maybeSingle: async () => result,
    then: (resolve: (value: Result) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return chain;
}
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      options: { cookies: { setAll: (cookies: MockState["cookies"]) => void } },
    ) => ({
      auth: {
        getUser: async () => {
          if (state.cookies.length) options.cookies.setAll(state.cookies);
          return { data: { user: state.user }, error: null };
        },
        signInWithPassword: async () => ({
          data: { session: {} },
          error: null,
        }),
        signUp: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
        exchangeCodeForSession: async () => ({ error: null }),
      },
      rpc: async () => ({ data: state.availability, error: null }),
      from: (table: string) =>
        query(
          table,
          state.clientResults.shift() || { data: null, error: null },
        ),
    }),
  ),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) =>
      query(table, state.adminResults.shift() || { data: null, error: null }),
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args });
      return { error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string, source: string, options: unknown) => {
          state.uploads.push({ path, source, options });
          return { error: null };
        },
      }),
    },
  })),
}));

const appRow = {
  id: "example.counter",
  owner_id: OWNER,
  name: "Counter",
  description: "Private",
  created_at: "2026-10-20T00:00:00Z",
};
const releaseRow = {
  id: RELEASE_ID,
  app_id: appRow.id,
  version: "1.0.0",
  digest: "a".repeat(64),
  byte_size: 100,
  package_path: "private/path.json",
  status: "published",
  created_at: "2026-10-20T00:00:00Z",
};
const ok = (data: unknown): Result => ({ data, error: null });
const call = (path: string, body?: string, origin = "http://localhost:3000") =>
  handlePrivateStore(
    new NextRequest(
      `http://localhost:3000/api/private-store/${path}`,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body,
          },
    ),
    path.split("/"),
  );

beforeEach(() => {
  state.user = { id: OWNER, email: "owner@example.test" };
  state.clientResults = [];
  state.adminResults = [];
  state.writes = [];
  state.uploads = [];
  state.cookies = [];
  state.availability = true;
  state.rpcCalls = [];
  vi.stubEnv("MOOBI_PUBLIC_STORE_ENABLED", "false");
  vi.stubEnv("MOOBI_STORE_REVIEWER_IDS", "");
  vi.stubEnv("SUPABASE_URL", "https://project.example.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-server-key");
  vi.stubEnv("MOOBI_APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN", "http://127.0.0.1:4100");
  vi.stubEnv("MOOBI_PRIVATE_PUBLISHING_ENABLED", "true");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("private publishing server authorization", () => {
  it("returns an honest unavailable state without Supabase configuration", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const response = await call("session");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      configured: false,
      user: null,
    });
  });
  it("rejects forged/missing sessions and cross-site mutations before writes", async () => {
    state.user = null;
    expect(
      (
        await call(
          "apps",
          JSON.stringify({
            id: "example.counter",
            name: "Counter",
            description: "",
          }),
        )
      ).status,
    ).toBe(401);
    expect((await call("apps", "{}", "https://attacker.example")).status).toBe(
      403,
    );
    expect(state.writes).toEqual([]);
    expect(state.uploads).toEqual([]);
  });
  it("derives ownership from the verified account, ignoring caller-supplied ownership", async () => {
    state.adminResults = [ok(appRow)];
    const response = await call(
      "apps",
      JSON.stringify({
        id: appRow.id,
        name: appRow.name,
        description: "Private",
        ownerId: MEMBER,
      }),
    );
    expect(response.status).toBe(201);
    expect(state.writes[0]).toEqual({
      table: "private_apps",
      method: "insert",
      value: {
        id: appRow.id,
        name: appRow.name,
        description: "Private",
        owner_id: OWNER,
      },
    });
  });
  it("does not let an invited account upload, publish or invite other users", async () => {
    state.user = { id: MEMBER, email: "member@example.test" };
    state.clientResults = [ok(appRow)];
    expect((await call(`apps/${appRow.id}/releases`, "{}")).status).toBe(404);
    state.clientResults = [ok(releaseRow), ok(appRow), ok(appRow), ok(appRow)];
    expect((await call(`releases/${RELEASE_ID}/publish`, "{}")).status).toBe(
      404,
    );
    state.clientResults = [ok(appRow)];
    expect(
      (
        await call(
          `apps/${appRow.id}/invite`,
          JSON.stringify({ email: "other@example.test" }),
        )
      ).status,
    ).toBe(404);
    expect(state.writes).toEqual([]);
    expect(state.uploads).toEqual([]);
  });
  it("rejects a package claiming a different app ID before storage", async () => {
    const { source } = await releaseFixture();
    state.clientResults = [ok({ ...appRow, id: "another.app" })];
    expect((await call("apps/another.app/releases", source)).status).toBe(400);
    expect(state.uploads).toEqual([]);
  });
  it("prevents silent replacement and makes identical upload retries idempotent", async () => {
    const { release, source } = await releaseFixture();
    state.clientResults = [ok(appRow)];
    state.adminResults = [ok(releaseRow)];
    expect((await call(`apps/${appRow.id}/releases`, source)).status).toBe(409);
    state.clientResults = [ok(appRow)];
    state.adminResults = [ok({ ...releaseRow, digest: release.digest })];
    expect((await call(`apps/${appRow.id}/releases`, source)).status).toBe(200);
    expect(state.uploads).toEqual([]);
  });
  it("stores validated bytes without upsert and leaves new releases as drafts", async () => {
    const { release, source } = await releaseFixture();
    state.clientResults = [ok(appRow)];
    state.adminResults = [
      ok(null),
      ok({ ...releaseRow, digest: release.digest, status: "draft" }),
    ];
    expect((await call(`apps/${appRow.id}/releases`, source)).status).toBe(201);
    expect(state.uploads[0].options).toEqual({
      contentType: "application/json",
      upsert: false,
    });
    expect(state.uploads[0].source).toBe(source);
    expect(state.writes[0]).toMatchObject({
      table: "private_releases",
      method: "insert",
      value: { status: "draft", digest: release.digest, app_id: appRow.id },
    });
  });
  it("does not acquire a draft or create an installation server-side", async () => {
    state.clientResults = [
      ok({ ...releaseRow, status: "draft" }),
      ok(appRow),
      ok(appRow),
    ];
    expect((await call(`releases/${RELEASE_ID}/acquire`, "{}")).status).toBe(
      409,
    );
    expect(state.writes).toEqual([]);
  });
  it("scopes acquisitions to the authenticated account", async () => {
    state.user = { id: MEMBER, email: "member@example.test" };
    state.clientResults = [ok(releaseRow), ok(appRow), ok(appRow)];
    state.adminResults = [ok(null)];
    expect(
      (
        await call(
          `releases/${RELEASE_ID}/acquire`,
          JSON.stringify({ userId: OWNER }),
        )
      ).status,
    ).toBe(200);
    expect(state.writes[0]).toMatchObject({
      table: "private_library",
      value: { user_id: MEMBER, app_id: appRow.id },
    });
  });
  it("returns private no-store responses and refreshes HTTP-only cookies without exposing tokens", async () => {
    state.cookies = [
      { name: "supabase-session", value: "test-token", options: { path: "/" } },
    ];
    const response = await call("session");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(await response.text()).not.toContain("test-token");
  });
  it("exchanges confirmation codes and redirects only to the configured Moobi origin", async () => {
    const response = await handlePrivateStore(
      new NextRequest(
        "http://localhost:3000/api/private-store/confirm?code=one-time-code&next=https://attacker.example",
      ),
      ["confirm"],
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?auth=confirmed",
    );
  });
});

describe("public Store API authorization and discovery", () => {
  const publicationRow = {
    release_id: RELEASE_ID,
    status: "approved",
    notes: "Reviewed",
    submitted_at: "2026-10-21T00:00:00Z",
    reviewed_at: "2026-10-21T00:00:00Z",
    reviewer_id: MEMBER,
  };
  it("fails closed until public Store is explicitly enabled", async () => {
    expect((await call("store/catalog")).status).toBe(503);
  });
  it("allows guest discovery of approved releases but excludes pending/private metadata", async () => {
    vi.stubEnv("MOOBI_PUBLIC_STORE_ENABLED", "true");
    state.user = null;
    state.clientResults = [
      ok([appRow]),
      ok([
        releaseRow,
        {
          ...releaseRow,
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          version: "1.1.0",
        },
      ]),
      ok([publicationRow]),
      ok([]),
    ];
    const response = await call("store/catalog");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.releases).toHaveLength(1);
    expect(body.releases[0].id).toBe(RELEASE_ID);
    expect(body.libraryAppIds).toEqual([]);
    expect((await call("store/library")).status).toBe(401);
  });
  it("requires server-configured reviewer authority, ignoring browser decisions", async () => {
    vi.stubEnv("MOOBI_PUBLIC_STORE_ENABLED", "true");
    expect(
      (
        await call(
          `store/releases/${RELEASE_ID}/review`,
          JSON.stringify({ decision: "approved", notes: "ok", reviewer: true }),
        )
      ).status,
    ).toBe(403);
    expect((await call("store/reviews")).status).toBe(403);
    expect(state.rpcCalls).toEqual([]);
    vi.stubEnv("MOOBI_STORE_REVIEWER_IDS", OWNER);
    expect(
      (
        await call(
          `store/releases/${RELEASE_ID}/review`,
          JSON.stringify({
            decision: "approved",
            notes: "Reviewed exact bytes",
            actor: MEMBER,
          }),
        )
      ).status,
    ).toBe(200);
    expect(state.rpcCalls).toEqual([
      {
        name: "review_store_release",
        args: {
          target_release: RELEASE_ID,
          actor: OWNER,
          decision: "approved",
          review_notes: "Reviewed exact bytes",
        },
      },
    ]);
  });
  it("derives the submission actor from the verified session", async () => {
    vi.stubEnv("MOOBI_PUBLIC_STORE_ENABLED", "true");
    expect(
      (
        await call(
          `store/releases/${RELEASE_ID}/submit`,
          JSON.stringify({ actor: MEMBER }),
        )
      ).status,
    ).toBe(200);
    expect(state.rpcCalls[0]).toEqual({
      name: "submit_store_release",
      args: { target_release: RELEASE_ID, actor: OWNER },
    });
  });
  it("blocks revoked/suspended acquisition before writing the account library", async () => {
    vi.stubEnv("MOOBI_PUBLIC_STORE_ENABLED", "true");
    state.availability = false;
    state.clientResults = [ok(releaseRow), ok(appRow), ok(appRow)];
    expect((await call(`releases/${RELEASE_ID}/acquire`, "{}")).status).toBe(
      403,
    );
    expect(state.writes).toEqual([]);
  });
  it("enforces revocation even when public discovery is turned off", async () => {
    state.availability = false;
    state.clientResults = [ok(releaseRow), ok(appRow), ok(appRow)];
    expect((await call(`releases/${RELEASE_ID}/acquire`, "{}")).status).toBe(
      403,
    );
    expect(state.writes).toEqual([]);
  });
  it("keeps unrelated public listings out of the private account library", async () => {
    state.clientResults = [
      ok([appRow, { ...appRow, id: "unrelated.app", owner_id: MEMBER }]),
      ok([releaseRow]),
      ok([]),
      ok([]),
    ];
    const response = await call("catalog");
    expect(response.status).toBe(200);
    const catalog = await response.json();
    expect(catalog.apps.map((app: { id: string }) => app.id)).toEqual([
      appRow.id,
    ]);
  });
  it("exposes availability for launch and rejects untrusted moderation", async () => {
    vi.stubEnv("MOOBI_PUBLIC_STORE_ENABLED", "true");
    state.availability = false;
    expect(
      await (await call(`store/releases/${RELEASE_ID}/availability`)).json(),
    ).toEqual({ available: false });
    expect(
      (
        await call(
          "store/apps/example.counter/moderate",
          JSON.stringify({ suspended: true, reason: "Review" }),
        )
      ).status,
    ).toBe(403);
    expect(state.writes).toEqual([]);
  });
});
