# Public Store and updates: slice 3

Status: implemented in code. The additive Supabase migration and reviewer setup
must be completed on each deployment. SQL, API authorization, encrypted update,
and recovery behavior have focused tests. This is not production security
certification or proof of a full authenticated browser acceptance run.

## Enable the slice

1. Complete [private Store and separate runtime setup](private-app-store.md).
2. In Supabase's SQL Editor, run the complete
   [202610210001_public_store.sql](../supabase/migrations/202610210001_public_store.sql)
   after the slice 2 migration. It adds review records and suspension controls,
   extends read policies for approved public metadata and account acquisitions,
   and keeps package objects private. Run it once; it is an additive migration,
   not a repeatable reset script. Use a transaction when applying manually.
3. Create and confirm a Moobi account for each reviewer. In Supabase
   Authentication → Users, copy its UUID into the server environment:

   ```dotenv
   MOOBI_STORE_REVIEWER_IDS=CONFIRMED_USER_UUID
   MOOBI_PUBLIC_STORE_ENABLED=true
   ```

   Multiple reviewer UUIDs are comma-separated. Never put this setting in a
   `NEXT_PUBLIC_` variable or user-editable account metadata. For local setup,
   this command resolves a confirmed, active account and adds its UUID while
   preserving the other `.env.local` values:

   ```bash
   node --env-file=.env.local scripts/configure-store-reviewer.mjs reviewer@example.com
   ```

   The selected reviewer email in this implementation session had no account
   yet. Signup and email confirmation must happen before running this command.
   The helper does not create accounts or send email.

4. Keep `MOOBI_PRIVATE_PUBLISHING_ENABLED=true` for release creation, private
   publishing, and acquisition. Restart Next.js after environment changes.
5. Reviewers sign in and open **Mi Store → Explore community apps → Review
   submissions**. Use a second account for reviewing an app you own: self-review
   is rejected in PostgreSQL even if someone calls the API directly.

The public flag controls the Moobi public workflow. The migration's RLS policies
make already-approved metadata readable through Supabase's Data API regardless
of that website flag. Turn off an app or release using suspension/revocation,
not by hiding the Store page. Download and launch availability remains enforced
when public discovery is switched off. A compatibility path recognizes an
unmigrated slice 2 database only when public Store is disabled and the new RPC
is absent; network/database failures do not grant access.

Production deployment of the separate HTTPS runtime, rate limits, independent
sandbox/security review, and broader browser acceptance remain release gates.
This slice does not deploy services or enable public publication automatically.

## Publish and review

1. In **My apps → Developer**, upload an immutable versioned package, preview
   it, and **Publish privately** as before.
2. Select **Submit for public review**. The exact release digest is submitted;
   this does not expose its listing or bytes publicly.
3. A configured reviewer opens the review desk and previews that exact package
   in the separate sandbox, including its requested storage permission and
   declared storage version. Inspect its behavior and description. The preview
   uses isolated reviewer preview data, not installed app data.
4. Enter user-visible review notes and approve or reject. Approved releases
   appear in community discovery. Rejected or revoked bytes cannot be silently
   resubmitted; the developer must upload a new version.

A developer cannot make a public release by changing a repository, clicking
private Publish, altering account metadata, or calling the service-only RPC with
a publishable key. Reviewer identity is verified server-side; the service-only
functions also enforce ownership, self-review rejection, and legal state
transitions under a row lock. Concurrent stale review decisions fail and require
refreshing. Review notes are visible to authors and, for approved releases, the
public; do not place secrets or internal personal information in them.

The review desk is for moderation, not customer star ratings or written reviews.
No ratings, download counts, screenshots, or performance claims are invented.
Metadata currently uses Supabase's deployment row limit (normally 1,000 rows per
query); larger catalogs need paginated server search before scaling distribution.

## Guest, account, and browser behavior

- Guests browse/search approved community metadata. They must sign in to acquire,
  download, install, or launch an account-owned installation. There are no fake
  guest acquisitions or guest package URLs.
- Get records an acquisition in the account library before downloading. Cancelling
  the download keeps the acquisition, so it can be retried in this or another
  browser. An acquisition never creates a launcher icon by itself.
- The library contains owned apps, private apps shared with the account, and
  acquired public apps. Acquiring a public app does not grant access to its
  future private-only releases. Acquisition/removal notices remain visible even
  when an approved release is revoked or its app is suspended.
- A new browser gets the account library after sign-in, then downloads packages
  explicitly. Package bytes, saved app data, recovery copies, and automatic-update
  choices remain local to that browser. App data does not sync between devices.
- Signing out removes the account's visible icons, previews, pending permission
  grants, and external recents. Encrypted local records remain scoped to that
  account for later sign-in. Uninstall can keep or explicitly delete local data;
  it does not remove the account acquisition.

## Manual and automatic updates

Version ordering is numeric `major.minor.patch`, never upload time or lexical
order. Only a newer published, authorized, available release is offered. The
highest available approved release is selected for public acquisitions. Private
owners/members can update to their authorized private releases as well.

A manual update downloads, checks size/hash/app/version/SDK, presents the target
permissions, and requires **Install update**. Availability is checked again at
commit. The repository checks the expected installed release under the shared
per-app lock, preventing a stale tab from overwriting another tab's update.

Package and installation metadata replace each other in one encrypted IndexedDB
record. A failed download, digest check, encryption, quota/write, or stale-version
check leaves the existing package installed. Saved app data is a separate record
and is not deleted or rewritten during update. A currently running app continues
its loaded version; the replacement starts on its next open. Updates do not reset
an active frame simply because another tab refreshes its library.

Automatic updates are **off by default** and opt-in per app in this browser.
They run when the signed-in user opens Community Store or chooses **Check for
updates**, while the document is visible. There is no timer, background service,
or website-load auto-install. Only verified newer packages with no added
permissions and the same storage version are eligible. A change requiring
permission confirmation or migration stays on the current release and reports
why. Automatic checks are serialized and account transitions/cancellation discard
pending work. Users can turn the preference off in My apps.

## Storage compatibility and recovery

The manifest accepts an optional positive integer `storageVersion`; omission
means version 1. For example:

```json
{
  "id": "yourname.counter",
  "name": "Counter",
  "version": "1.1.0",
  "sdkVersion": 1,
  "storageVersion": 1,
  "entry": "index.html",
  "permissions": ["storage"]
}
```

Updates must preserve the existing storage version. A declared change is blocked
for manual and automatic updates without modifying the installed package/data.
Arbitrary migration scripts are not supported in this SDK. Authors must keep
same-version data backward compatible and publish a separate app identity for
an intentionally incompatible format until a reviewed migration API exists.
SDK versions and permissions outside the supported package contract are rejected
before execution. `storageVersion` is a developer compatibility declaration; it
cannot prove the submitted code honors that declaration.

One previous verified package is retained with a successful update. **Restore
v… (keep data)** in My apps, or the recovery action after a sandbox startup/error
failure, restores it atomically and turns automatic updates off. A missing or
corrupt recovery package produces an error rather than replacing the good record.
Recovery preserves current saved data; it is not a time-travel backup of data
that the newer app itself changed. Restored versions still need current server
availability before launch. A revoked previous release cannot bypass moderation.

## Suspension and revocation

Reviewers can suspend an entire app with a reason, restore its availability, or
revoke an approved release. Discovery excludes suspended apps and revoked
releases. Acquisition and package download fail before library writes or object
access. Installed-app launch checks the same server eligibility before executing
cached bytes and checks again on document visibility/focus resume. Saved files
and data remain for recovery or restored access.

There is no continuous remote kill switch: a foreground frame remains active
until a subsequent availability check, app switch/reopen, or focus/visibility
resume. Already delivered code cannot be remotely erased from someone else's
browser. Network failure during eligibility checks produces a retryable state;
there is no offline bypass or same-origin execution fallback. Full offline shell
and runtime launch remain unimplemented.

## Validation

Focused tests cover the actual additive PostgreSQL migration in PGlite, anonymous
and account RLS, service-only review functions, owner/self-review/stale-decision
rejection, approved-only discovery, acquisition metadata after revocation,
private future release isolation, suspension, API reviewer/actor checks,
numeric version selection, manual consent, automatic opt-in, added permissions,
storage migrations, corrupted downloads, encryption/IndexedDB write failures,
stale account/tab work, data retention, and package recovery.

Run:

```bash
npx vitest run tests/public-store-policies.test.ts tests/private-store-api.test.ts tests/mini-app-updates.test.ts tests/store-updates-state.test.ts tests/store-reviewer-setup.test.ts
npm run typecheck
npm run lint
npm run build -- --webpack
```

The SQL tests execute PostgreSQL policies and triggers, but do not establish
hosted Supabase rollout or email delivery. API tests mock Supabase transport;
IndexedDB tests use fake-indexeddb. The earlier slice 2 live test is not evidence
of slice 3 review/update behavior. Run the following real acceptance flow after
applying the migration and configuring reviewers:

1. With separate owner and reviewer accounts, submit `1.0.0`; verify guests cannot
   find it before approval. Reject owner self-review and unrelated review calls.
2. Approve it, then acquire/install from a third account without a private grant.
   Save a counter value. Confirm a second browser sees the acquisition but needs
   its own download and does not receive the first browser's saved app data.
3. Upload/publish/approve `1.1.0`; verify the old version stays until Update is
   confirmed, then verify the saved counter value survives.
4. Interrupt a download and exercise a quota failure; verify the old package
   still opens. Restore the previous version and check the data remains.
5. Opt in to automatic updates, publish a same-schema/same-permission release,
   and open Community Store. Repeat with added storage permission and with a
   changed storage version; these must require consent or remain blocked.
6. Revoke the new version, suspend/restore the app, and verify discovery,
   acquisition, package requests, next launch, and resume checks behave as stated.

### Recorded checks (2026-10-21)

- Focused command above: **46 passed**.
- Full suite (`npx vitest run --reporter=json --outputFile=/tmp/moobi-slice3-final-tests.json`):
  **597 passed**, three existing failures in `tests/settings-details.test.ts`,
  one opt-in slice 2 live test skipped. The existing failures expect unchanged
  brightness/volume label markup and a Recharge to 100% button.
- `npm run typecheck`: passed.
- `npm run build -- --webpack`: passed.
- `npm run lint`: zero errors; its zero-warning gate still fails on the existing
  unused `LuRotateCcw` in BatteryControls and `trackCount` in QueueSheet.
- Chrome: verified the Community Store entry and unavailable state inside the
  virtual phone. Authenticated public approval/install/update/recovery UI and
  light-theme/cross-browser acceptance are not verified by this check.
- `git diff --check`: passed. No new dependencies were added for slice 3.
- The configured Supabase project was queried read-only for the selected reviewer
  email; no matching account existed. No reviewer access was granted. The browser
  SQL editor did not reliably accept the migration text, so the migration was
  **not executed** and public Store was **not enabled** in `.env.local`. Apply
  the migration and finish confirmed-account setup before enabling the flag.

References: [Supabase database functions](https://supabase.com/docs/guides/database/functions)
and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
