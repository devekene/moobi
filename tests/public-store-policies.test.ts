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
const V2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRIVATE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
describe("public Store review, library and moderation SQL", () => {
  const db = new PGlite();
  beforeAll(async () => {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    for (const file of [
      "202610200001_private_app_store.sql",
      "202610210001_public_store.sql",
    ])
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${file}`, import.meta.url),
          "utf8",
        ),
      );
    await db.exec(`insert into auth.users values('${OWNER}','owner@example.test',now()),('${MEMBER}','member@example.test',now()),('${OTHER}','reviewer@example.test',now());
      insert into public.private_apps(id,owner_id,name) values('example.counter','${OWNER}','Counter');
      insert into public.private_releases(id,app_id,version,digest,byte_size,package_path,status) values
      ('${RELEASE_ID}','example.counter','1.0.0',repeat('a',64),100,'v1','published'),
      ('${V2}','example.counter','1.10.0',repeat('b',64),100,'v2','published'),
      ('${PRIVATE}','example.counter','2.0.0',repeat('c',64),100,'private','published');`);
  }, 30000);
  beforeEach(async () => {
    await db.exec("begin");
  });
  afterEach(async () => {
    await db.exec("rollback");
  });
  afterAll(async () => {
    await db.close();
  });
  const asUser = async (id: string) =>
    db.exec(
      `set local role authenticated;set local "request.jwt.claim.sub"='${id}';`,
    );
  const approve = async (id = RELEASE_ID) => {
    await db.exec(
      `select public.submit_store_release('${id}','${OWNER}');select public.review_store_release('${id}','${OTHER}','approved','Reviewed exact package');`,
    );
  };
  it("hides private and pending releases from guests and unrelated accounts", async () => {
    await db.exec(
      `select public.submit_store_release('${RELEASE_ID}','${OWNER}');set local role anon;`,
    );
    expect((await db.query("select id from public.private_apps")).rows).toEqual(
      [],
    );
    expect(
      (await db.query("select * from public.store_publications")).rows,
    ).toEqual([]);
    await asUser(MEMBER);
    expect(
      (await db.query("select id from public.private_releases")).rows,
    ).toEqual([]);
  });
  it("only exposes approved published releases to guests, without write privileges", async () => {
    await approve();
    await db.exec("set local role anon");
    expect(
      (await db.query("select id from public.private_apps")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.private_releases")).rows,
    ).toEqual([{ id: RELEASE_ID }]);
    await expect(
      db.exec(`update public.store_publications set status='approved'`),
    ).rejects.toThrow("permission denied");
  });
  it("disallows owner self review and final-decision resubmission", async () => {
    await db.exec(
      `select public.submit_store_release('${RELEASE_ID}','${OWNER}')`,
    );
    await expect(
      db.exec(
        `select public.review_store_release('${RELEASE_ID}','${OWNER}','approved','self approval')`,
      ),
    ).rejects.toThrow("own releases");
  });
  it("preserves final decisions and rejects stale concurrent review transitions", async () => {
    await approve();
    await expect(
      db.exec(
        `select public.review_store_release('${RELEASE_ID}','${OTHER}','rejected','stale decision')`,
      ),
    ).rejects.toThrow("state changed");
  });
  it("keeps acquisition metadata across revocation without exposing private future versions", async () => {
    await approve();
    await db.exec(
      `insert into public.private_library(user_id,app_id) values('${MEMBER}','example.counter');select public.review_store_release('${RELEASE_ID}','${OTHER}','revoked','Unsafe release');`,
    );
    await asUser(MEMBER);
    expect(
      (await db.query("select app_id from public.private_library")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.private_releases")).rows,
    ).toEqual([{ id: RELEASE_ID }]);
    expect(
      (
        await db.query(
          `select public.store_release_available('${RELEASE_ID}') as available`,
        )
      ).rows,
    ).toEqual([{ available: false }]);
    await db.exec("set local role anon");
    expect((await db.query("select id from public.private_apps")).rows).toEqual(
      [],
    );
  });
  it("suspends discovery and all acquisition/download eligibility, including private members", async () => {
    await approve();
    await db.exec(
      `insert into public.private_app_members values('example.counter','${MEMBER}');insert into public.store_app_controls values('example.counter',true,'Policy review');set local role anon;`,
    );
    expect(
      (await db.query("select id from public.private_releases")).rows,
    ).toEqual([]);
    await asUser(MEMBER);
    expect(
      (
        await db.query(
          `select public.store_release_available('${RELEASE_ID}') as available`,
        )
      ).rows,
    ).toEqual([{ available: false }]);
  });
  it("allows an older approved release when a newer release is revoked", async () => {
    await approve();
    await approve(V2);
    await db.exec(
      `select public.review_store_release('${V2}','${OTHER}','revoked','New release issue');`,
    );
    await asUser(MEMBER);
    expect(
      (
        await db.query(
          `select public.store_release_available('${RELEASE_ID}') as available`,
        )
      ).rows,
    ).toEqual([{ available: true }]);
    expect(
      (
        await db.query(
          `select public.store_release_available('${V2}') as available`,
        )
      ).rows,
    ).toEqual([{ available: false }]);
  });
  it("denies direct calls to service-only submit/review RPCs", async () => {
    await asUser(OWNER);
    await expect(
      db.exec(`select public.submit_store_release('${RELEASE_ID}','${OWNER}')`),
    ).rejects.toThrow("permission denied");
  });
  it("denies ownership forgery even inside the service submission function", async () => {
    await expect(
      db.exec(
        `select public.submit_store_release('${RELEASE_ID}','${MEMBER}')`,
      ),
    ).rejects.toThrow("Only the owner");
  });
  it("keeps private package bucket and immutable release bytes unchanged", async () => {
    await approve();
    expect((await db.query("select public from storage.buckets")).rows).toEqual(
      [{ public: false }],
    );
    await expect(
      db.exec(
        `update public.private_releases set digest=repeat('f',64) where id='${RELEASE_ID}'`,
      ),
    ).rejects.toThrow("immutable");
  });
});
