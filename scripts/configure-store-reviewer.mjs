// @ts-check
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Preserve the existing environment verbatim except for the reviewer-ID entry.
 * @param {string} source @param {string} id */
export function addReviewerToEnvironment(source, id) {
  if (!uuid.test(id)) throw new Error("Invalid reviewer user ID.");
  const entries = source.split(/\r?\n/);
  const ids = new Set([id]);
  for (const line of entries) {
    const match = line.match(/^\s*MOOBI_STORE_REVIEWER_IDS\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    for (const value of match[1]
      .replace(/^["']|["']$/g, "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)) {
      if (!uuid.test(value))
        throw new Error(
          "Existing reviewer configuration contains an invalid ID. Fix it before adding reviewers.",
        );
      ids.add(value);
    }
  }
  const setting = `MOOBI_STORE_REVIEWER_IDS=${[...ids].sort().join(",")}`;
  let replaced = false;
  const updated = entries.flatMap((line) => {
    if (!/^\s*MOOBI_STORE_REVIEWER_IDS\s*=/.test(line)) return [line];
    if (replaced) return [];
    replaced = true;
    return [setting];
  });
  if (!replaced) {
    if (updated.at(-1) === "") updated.pop();
    updated.push(setting, "");
  }
  return updated.join(source.includes("\r\n") ? "\r\n" : "\n");
}
async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error(
      "Usage: node --env-file=.env.local scripts/configure-store-reviewer.mjs reviewer@example.com",
    );
  const url = process.env.SUPABASE_URL,
    secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret)
    throw new Error(
      "Load Supabase server configuration from .env.local first.",
    );
  const client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error)
      throw new Error(
        "Supabase account lookup failed. Check the server key and connection.",
      );
    const user = data.users.find(
      (entry) => entry.email?.toLowerCase() === email,
    );
    if (user) {
      if (!user.email_confirmed_at)
        throw new Error(
          "Confirm this account’s email in Moobi before granting reviewer access.",
        );
      if (user.banned_until && Date.parse(user.banned_until) > Date.now())
        throw new Error(
          "This account is disabled. Choose an active confirmed account.",
        );
      const path = fileURLToPath(new URL("../.env.local", import.meta.url));
      const source = await readFile(path, "utf8");
      await writeFile(path, addReviewerToEnvironment(source, user.id), {
        mode: 0o600,
      });
      console.log(
        "Confirmed account added to MOOBI_STORE_REVIEWER_IDS. Other environment entries were preserved. Restart Next.js before reviewing submissions.",
      );
      return;
    }
    if (data.users.length < 1000) break;
  }
  throw new Error(
    "No Moobi account has this email yet. Sign up in Mi Store, confirm the email, then rerun this command. No configuration was changed.",
  );
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Reviewer setup failed.",
    );
    process.exitCode = 1;
  });
}
