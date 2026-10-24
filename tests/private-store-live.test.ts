import "fake-indexeddb/auto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SAMPLE_PACKAGE } from "@/lib/mini-app-sample";
import {
  packageDigest,
  parseMiniAppPackage,
  isRecord,
} from "@/lib/mini-app-package";
import {
  parsePrivateApp,
  parsePrivateCatalog,
  parsePrivateRelease,
} from "@/lib/private-store-contract";
import { createInstallationRepository } from "@/lib/mini-app-installations";
import { getPhoneApps, externalAppId } from "@/lib/phone-apps";
import type { PrivateStoreDatabase } from "@/lib/server/private-store-database";
import { repositoryFixture } from "./private-store-fixtures";

/** Opt-in: creates two confirmed test accounts and an immutable private release.
 * No email is sent. Accounts are banned in finally; release records are retained.
 * Run only against a designated Moobi project, with explicit operator approval.
 */
describe.skipIf(process.env.MOOBI_LIVE_STORE_TESTS !== "true")(
  "live Supabase private-store acceptance",
  () => {
    it("publishes, authorizes, downloads and installs an exact release across two real accounts", async () => {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SECRET_KEY;
      const origin = process.env.MOOBI_APP_ORIGIN || "";
      if (!url || !key || !origin)
        throw new Error(
          "Configure the Supabase project and start Moobi first.",
        );
      const admin = createClient<PrivateStoreDatabase>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const run = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
      const appId = `moobi-smoke-${run}`;
      const password = crypto.randomUUID() + crypto.randomUUID();
      const users: { id: string; email: string }[] = [];
      function actor() {
        const cookies = new Map<string, string>();
        return async (path: string, body?: string) => {
          const response = await fetch(`${origin}/api/private-store/${path}`, {
            method: body === undefined ? "GET" : "POST",
            headers: {
              Origin: origin,
              "Content-Type": "application/json",
              Cookie: [...cookies]
                .map(([name, value]) => `${name}=${value}`)
                .join("; "),
            },
            body,
          });
          for (const value of response.headers.getSetCookie()) {
            const pair = value.split(";", 1)[0];
            const index = pair.indexOf("=");
            if (index > 0)
              cookies.set(pair.slice(0, index), pair.slice(index + 1));
          }
          const data: unknown = await response.json();
          return { response, data };
        };
      }
      const owner = actor();
      const member = actor();
      try {
        for (const role of ["owner", "member"]) {
          const email = `moobi-${role}-${run}@example.invalid`;
          const created = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (created.error || !created.data.user)
            throw new Error(
              `Could not create disposable ${role} fixture: ${created.error?.message ?? "unknown"}`,
            );
          users.push({ id: created.data.user.id, email });
        }
        expect(
          (
            await owner(
              "session",
              JSON.stringify({
                action: "signin",
                email: users[0].email,
                password,
              }),
            )
          ).response.status,
        ).toBe(200);
        expect(
          (
            await member(
              "session",
              JSON.stringify({
                action: "signin",
                email: users[1].email,
                password,
              }),
            )
          ).response.status,
        ).toBe(200);
        expect(
          (
            await owner(
              "apps",
              JSON.stringify({
                id: appId,
                name: "Moobi verification",
                description: "Disposable private acceptance fixture",
              }),
            )
          ).response.status,
        ).toBe(201);
        const parsed = parseMiniAppPackage(
          JSON.stringify({
            ...SAMPLE_PACKAGE,
            manifest: { ...SAMPLE_PACKAGE.manifest, id: appId },
          }),
        );
        const source = JSON.stringify(parsed);
        const uploaded = await owner(`apps/${appId}/releases`, source);
        expect(uploaded.response.status).toBe(201);
        if (!isRecord(uploaded.data)) throw new Error("Invalid upload result");
        const draft = parsePrivateRelease(uploaded.data.release);
        expect(draft.status).toBe("draft");
        expect(draft.digest).toBe(await packageDigest(parsed));
        expect(
          (await member(`releases/${draft.id}/acquire`, "{}")).response.status,
        ).toBe(404);
        const published = await owner(`releases/${draft.id}/publish`, "{}");
        expect(published.response.status).toBe(200);
        expect(
          (
            await owner(
              `apps/${appId}/invite`,
              JSON.stringify({ email: users[1].email }),
            )
          ).response.status,
        ).toBe(200);
        const catalog = parsePrivateCatalog((await member("catalog")).data);
        expect(catalog.apps.some((app) => app.id === appId)).toBe(true);
        expect(
          (await member(`apps/${appId}/releases`, source)).response.status,
        ).toBe(404);
        expect(
          (await member(`releases/${draft.id}/publish`, "{}")).response.status,
        ).toBe(404);
        const acquired = await member(`releases/${draft.id}/acquire`, "{}");
        expect(acquired.response.status).toBe(200);
        if (!isRecord(acquired.data))
          throw new Error("Invalid acquisition result");
        const app = parsePrivateApp(acquired.data.app);
        const release = parsePrivateRelease(acquired.data.release);
        const packageResult = await member(`releases/${release.id}/package`);
        expect(packageResult.response.status).toBe(200);
        const downloaded = JSON.stringify(
          parseMiniAppPackage(JSON.stringify(packageResult.data)),
        );
        const { repository, name, cipher } = await repositoryFixture();
        await repository.install(users[1].id, app, release, downloaded);
        await repository.storage(users[1].id)(appId, "set", "count", "7");
        const reopened = createInstallationRepository(cipher, name);
        const snapshot = await reopened.list(users[1].id);
        expect(
          getPhoneApps(snapshot.installations).some(
            (entry) => entry.id === externalAppId(appId),
          ),
        ).toBe(true);
        expect(await reopened.storage(users[1].id)(appId, "get", "count")).toBe(
          "7",
        );
        await reopened.uninstall(users[1].id, appId, false);
        await reopened.install(users[1].id, app, release, downloaded);
        expect(await reopened.storage(users[1].id)(appId, "get", "count")).toBe(
          "7",
        );
        await reopened.uninstall(users[1].id, appId, true);
        expect(
          await reopened.storage(users[1].id)(appId, "get", "count"),
        ).toBeNull();
        const changed = JSON.stringify({
          ...parsed,
          files: {
            ...parsed.files,
            "app.js": parsed.files["app.js"] + "\n/* changed */",
          },
        });
        expect(
          (await owner(`apps/${appId}/releases`, changed)).response.status,
        ).toBe(409);
        expect(
          (await owner(`apps/${appId}/releases`, source)).response.status,
        ).toBe(200);
        expect(
          parseMiniAppPackage(
            JSON.stringify(
              (await member(`releases/${release.id}/package`)).data,
            ),
          ),
        ).toEqual(parsed);
        const guest = await fetch(
          `${origin}/api/private-store/releases/${release.id}/package`,
        );
        expect(guest.status).toBe(401);
        console.log(
          `Retained private acceptance fixture: ${appId} (test accounts disabled after verification).`,
        );
      } finally {
        await Promise.allSettled([
          owner("session", JSON.stringify({ action: "signout" })),
          member("session", JSON.stringify({ action: "signout" })),
        ]);
        for (const user of users) {
          const banned = await admin.auth.admin.updateUserById(user.id, {
            ban_duration: "876000h",
          });
          if (banned.error)
            throw new Error(
              `Disable the disposable test account ${user.id} in Supabase Auth; automatic cleanup failed.`,
            );
        }
      }
    }, 120_000);
  },
);
