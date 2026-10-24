import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { OWNER, MEMBER, OTHER, RELEASE_ID } from "./private-store-fixtures";

describe("private store PostgreSQL policies and immutable releases", () => {
  const db = new PGlite();
  beforeAll(async () => {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema public, auth to authenticated, service_role;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610200001_private_app_store.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(`insert into auth.users values ('${OWNER}', 'owner@example.test', now()), ('${MEMBER}', 'member@example.test', now()), ('${OTHER}', 'other@example.test', now());
      insert into public.private_apps(id, owner_id, name) values ('example.counter', '${OWNER}', 'Counter');
      insert into public.private_app_members values ('example.counter', '${MEMBER}');
      insert into public.private_releases(id, app_id, version, digest, byte_size, package_path, status) values
        ('${RELEASE_ID}', 'example.counter', '1.0.0', repeat('a', 64), 100, 'owner/package1.json', 'published'),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'example.counter', '1.1.0', repeat('b',64), 100, 'owner/package2.json', 'draft');`);
  }, 30_000);
  beforeEach(async () => {
    await db.exec("begin");
  });
  afterEach(async () => {
    await db.exec("rollback");
  });
  afterAll(async () => {
    await db.close();
  });
  async function asUser(id: string) {
    await db.exec(
      `set local role authenticated; set local "request.jwt.claim.sub" = '${id}';`,
    );
  }
  it("lets owners see drafts while members see only published releases", async () => {
    await asUser(OWNER);
    expect(
      (await db.query("select id from public.private_releases")).rows,
    ).toHaveLength(2);
    await asUser(MEMBER);
    expect(
      (await db.query("select id from public.private_apps")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.private_releases")).rows,
    ).toEqual([{ id: RELEASE_ID }]);
  });
  it("hides app and release metadata from other accounts", async () => {
    await asUser(OTHER);
    expect((await db.query("select id from public.private_apps")).rows).toEqual(
      [],
    );
    expect(
      (await db.query("select id from public.private_releases")).rows,
    ).toEqual([]);
  });
  it("does not let owners bypass server validation by writing directly to tables", async () => {
    await asUser(OWNER);
    await expect(
      db.exec(
        "update public.private_releases set status='published' where version='1.1.0'",
      ),
    ).rejects.toThrow("permission denied");
  });
  it("does not expose the service-only invitation function to authenticated clients", async () => {
    await asUser(OWNER);
    await expect(
      db.exec(
        "select public.grant_private_app('example.counter', 'other@example.test')",
      ),
    ).rejects.toThrow("permission denied");
  });
  it("prevents changing published version bytes even through privileged writes", async () => {
    await db.exec("set local role service_role");
    await expect(
      db.exec(
        `update public.private_releases set digest=repeat('c',64) where id='${RELEASE_ID}'`,
      ),
    ).rejects.toThrow("immutable");
  });
  it("prevents deleting and republishing a version identity", async () => {
    await db.exec("set local role service_role");
    await expect(
      db.exec(`delete from public.private_releases where id='${RELEASE_ID}'`),
    ).rejects.toThrow("cannot be deleted");
  });
  it("allows the explicit draft-to-published transition", async () => {
    await db.exec(
      "set local role service_role; update public.private_releases set status='published' where version='1.1.0'",
    );
    await asUser(MEMBER);
    expect(
      (await db.query("select id from public.private_releases")).rows,
    ).toHaveLength(2);
  });
  it("uses a private, size-limited JSON bucket", async () => {
    const result = await db.query(
      "select public, file_size_limit, allowed_mime_types from storage.buckets",
    );
    expect(result.rows).toEqual([
      {
        public: false,
        file_size_limit: 262144,
        allowed_mime_types: ["application/json"],
      },
    ]);
  });
});
