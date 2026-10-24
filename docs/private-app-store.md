# Private publishing and installation: slice 2

Scope note: public discovery, review, and updates are now implemented in
[slice 3](public-app-store.md); this guide documents the private foundation.

Status: implemented and verified against the configured Supabase project with
two disposable accounts. Production deployment and broader browser acceptance
remain required. Public discovery, reviews,
automatic updates, GitHub builds, payments, and team publishing roles are outside
this slice. Each app has one owner; other confirmed accounts can be granted
permission to install its privately published releases.

## Supabase project setup

1. Create a dedicated Moobi project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Find the project URL and API keys in the Connect/API Keys panels. Add the
   following entries to the existing `.env.local`, preserving its other values:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
   MOOBI_APP_ORIGIN=http://localhost:3000
   NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN=http://127.0.0.1:4100
   MOOBI_PRIVATE_PUBLISHING_ENABLED=false
   ```

   Legacy anon and service-role keys can fill the publishable and secret entries,
   respectively. Never prefix either server secret with `NEXT_PUBLIC_`, put it in
   an app package, commit it, or paste it into chat. The runtime service does not
   need Supabase credentials.

3. Run [202610200001_private_app_store.sql](../supabase/migrations/202610200001_private_app_store.sql)
   once in the project's SQL Editor, or apply it through your existing Supabase
   migration workflow. It creates the catalog, membership, acquisition records,
   RLS policies, immutable-release trigger, and private package bucket.
4. In Auth URL Configuration, set Site URL to `http://localhost:3000` and allow
   `http://localhost:3000/api/private-store/confirm` as a redirect URL. Keep email
   confirmation enabled. Signup uses the server's PKCE code exchange callback;
   the redirect destination is fixed to Moobi, not a caller-supplied URL.
5. Start the two services in separate terminals:

   ```bash
   npm run dev
   ```

   ```bash
   npm run runtime:dev
   ```

   Open Moobi at **http://localhost:3000**, not 127.0.0.1. The runtime listens at
   **http://127.0.0.1:4100** and accepts the localhost Moobi origin. The runtime
   deliberately does not load `.env.local`; its development default is the exact
   `http://localhost:3000` app origin. For another app URL, pass
   `MOOBI_APP_ORIGIN` explicitly to the runtime process.

6. After the migration and runtime are ready, set
   `MOOBI_PRIVATE_PUBLISHING_ENABLED=true` in `.env.local` and restart Next.js.
   Changes to `NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN` also require a development
   restart or production rebuild.

Moobi shows an unavailable state when Supabase is unconfigured. It does not
substitute local fake accounts or simulated server publication. Publishing and
new acquisitions are disabled unless the explicit flag and runtime configuration
are valid. Local App Sandbox remains usable independently.

### Production runtime

Deploy `runtime/server.mjs` as a small, separate Node HTTP service behind HTTPS.
Set `NODE_ENV=production`, `MOOBI_APP_ORIGIN` to the exact HTTPS Moobi origin,
`HOST=0.0.0.0`, and the host's supplied `PORT`, then run `npm run runtime:start`.
The service uses Node built-ins only. Do not pass it the Supabase secret or the
Moobi server environment file.

Use a different, cookie-free hostname, preferably a separate site, and set the
Moobi deployment's `NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN` to that HTTPS origin.
Update the Supabase Site URL and allowed callback URL for production. Preserve
the runtime's CSP, permissions, no-store, and referrer headers through proxies.
Configure deployment request/concurrency/rate limits before wider distribution.

Different ports on the same hostname are insufficient: cookies are not
port-scoped. The server rejects equal app/runtime hostnames even in development.
Use localhost for Moobi and 127.0.0.1 for its development runtime. Production
requires HTTPS for both. Moobi session cookies are HTTP-only, host-only,
SameSite=Lax, and Secure in production.

## Two-account acceptance walkthrough

1. On Home page 2, open **Mi Store → Private apps & publishing**. Create the owner
   account, confirm its email, and sign in. If confirmation opens in a different
   browser, sign in manually in Moobi afterward.
2. In **Developer**, create `example.counter` with the name Pocket Counter, or
   choose your own stable app ID. IDs are globally unique within this Supabase
   project; another account cannot take ownership of an existing ID.
3. In Settings → App Sandbox, download the sample JSON. For a different app ID,
   edit `manifest.id` to match the app you created. Upload it under that app in
   Developer. Alternatively upload a ZIP in the format below.
4. The release appears as **draft**. Preview it in the separate runtime, stop the
   preview, and select **Publish privately**. Publication never happens just
   because a package was uploaded or source code changed.
5. Create and confirm a second account, preferably in another browser profile.
   As the owner, grant access using that account's confirmed email. No invitation
   message is sent; the recipient signs in and refreshes Private apps.
6. As the recipient, select **Get**. Moobi acquires access, downloads the exact
   release, verifies its content, and shows the requested storage permission.
   Select **Install app** to commit the files and expose the launcher entry.
7. Open it from Home page 2 or App Library, increment the counter, switch apps,
   reopen it, and refresh the whole Moobi page. After sign-in/session restoration,
   the installed app and its saved value should remain.
8. Uninstall with the delete-data checkbox off. Reinstall and check that the value
   remains. Repeat with the checkbox on to verify explicit data deletion.
9. Sign out and sign into another account: that account must not see the former
   account's installed apps, private previews, or app data. Signing back into the
   original account restores its locally stored installations.
10. Negative checks: attempt publication/upload from an invited account; upload
    changed files with the same version; interrupt a download; corrupt/remove
    local package storage; select an unsupported SDK version. None should create
    a false working installation or silently overwrite existing data.

Supabase's default email service has sending limits. If confirmation emails are
not arriving, inspect Auth logs and configure your own SMTP as needed; do not
disable confirmation to conceal a delivery problem.

## ZIP and release contract

A ZIP contains exactly four regular UTF-8 text files at its root:

```text
manifest.json   # the existing manifest object, without a formatVersion/files wrapper
index.html      # body markup
app.css
app.js
```

The manifest and SDK follow [the existing package contract](mini-app-sandbox.md).
ZIP upload is capped at 512 KiB; total extracted text is capped at 256 KiB. The
canonical JSON package must also fit 256 KiB. Unsupported/missing/duplicate
files, nested paths, traversal, symlinks, encryption, and invalid SDK/permissions
are rejected. Extraction streams one allowlisted file at a time in memory and
checks actual output sizes; it never writes archive paths to disk. JSON uploads
use the same validator and 256 KiB limit.

The server derives publisher identity from a verified Supabase session, checks
ownership through an authenticated RLS read, checks the package's app ID, and
calculates its canonical SHA-256 digest and byte size. It uploads a JSON artifact
to a private object path with `upsert: false`, then inserts a draft release.
The unique `(app_id, version)` constraint and an immutable-identity trigger protect
version identity. Retrying the same version with identical bytes is idempotent;
different bytes require another version. Concurrent retries return the winning
record when its digest matches. A storage object can be orphaned by a failed DB
insert; it remains private and is never discoverable as a published release.
Administrative orphan cleanup is not automated in this slice.

Only the owner can publish or grant membership. Members can read published
metadata and acquire/download those releases; they cannot see drafts. Client
roles have no table-write privileges and no private-bucket object policies. All
mutation paths use server-only credentials after authorization. Audit any
pre-existing broad storage policies if reusing a Supabase project: additive
policies must not accidentally grant access to this bucket.

## Installation, account boundaries, and recovery

The shared `lib/phone-apps.ts` resolver combines bundled registry entries with
verified installations. External targets use `external:<app-id>` so they cannot
replace a bundled screen. Home ordering, App Library search/categories, recents,
and the app switcher consume the same resolved metadata. Optional app code and
publishing UI remain lazy-loaded; Supabase/ZIP libraries stay server-side.

Installation records and their package bytes are one AES-GCM-encrypted IndexedDB
record in `moobi-mini-apps-v1`. Install commits atomically only after metadata,
manifest identity, version, byte size, and SHA-256 agree. Integrity is checked
again on launch. An identical installation is idempotent; installing another
release over it is rejected by Install; use the explicit slice 3 Update flow.
Publishing a new version does not silently update an installed one.

App data uses the shared cipher/storage validator with an account-and-app
namespace in the same database. Private preview data is separate from installed
app data. Per-app Web Locks and a local queue serialize writes and uninstall;
uninstall atomically removes the package and, only when explicitly selected, its
data. Quotas remain 32 keys, 4 KiB/value, and 32 KiB serialized data per app.

Signing out clears active client identity, visible installations, pending grants,
private previews, and external recents, while preserving encrypted files for that
account. Other tabs are notified without transmitting tokens. Downloads check
the current account before staging/committing. A failed account refresh keeps
existing local state and exposes an error instead of claiming a successful
logout. Browser-side encryption is not a separate OS account security boundary;
compromised trusted host code or someone controlling browser storage can still
access the installation's key.

Missing records appear as not installed; a fresh download can restore them.
Unreadable package records are retained and offered an explicit remove/re-download
repair action, preserving app data. Interrupted downloads, crypto/quota failures,
do not create working-looking icons. Runtime outages show a recoverable error
while preserving verified installations. Uninstall affects this
browser only and does not delete account acquisition records or server releases.
The library lists all apps currently owned/shared with the signed-in account;
the acquisition table separately records Get actions for later library features.

## Runtime and offline limits

Authenticated private apps always use the separate runtime. The host sends the
already verified document as UTF-8/base64 by a form POST to its `/render` endpoint after loading
an empty `/bootstrap` frame. Response-header CSP applies sandboxing even when the
document is visited outside the iframe. The iframe additionally keeps
`sandbox="allow-scripts"`, without `allow-same-origin`; parent/session/source
checks authenticate the SDK bridge. No Supabase token or user credentials are
included in the form. Non-Moobi origins, arbitrary routes, and oversized documents
are rejected. The service stores neither packages nor sessions.

The base64 transfer is deliberate: browsers normalize line endings in raw form
values, which would invalidate CSP script hashes. The runtime decodes canonical
base64 and strict UTF-8 before responding, preserving the exact document bytes.

The fixed response policy and document policy deny connection APIs, external
resources, workers, nested frames, forms, popups, top navigation and downloads.
Iframe self-navigation is still not a general network firewall; subsequent loads
revoke the bridge and remove the frame. Resource abuse can still affect a tab;
the service/iframe boundary is not proof of CPU or process isolation. Wider
distribution still needs an independent security and cross-browser review.

Package bytes survive refresh without re-downloading from release storage.
**Full offline site startup and runtime launch are not implemented**: the shell,
session restoration, and runtime bootstrap/render requests still need network
access. There is no insecure same-origin fallback when the runtime is unavailable.
The installed files/data are preserved and the user can retry. Offline shell and
runtime caching require a reviewed design across the two origins; this slice must
not be advertised as a fully offline app store.

Public review, release revocation/suspension, compatibility checks, manual/optional
automatic updates, and recovery are described in [slice 3](public-app-store.md).
Declared storage-version changes are blocked; arbitrary data migrations are not supported.
Previously installed bytes are not remotely erased by this slice.

## Dependencies and validation

- `@supabase/ssr` and `@supabase/supabase-js`: supported server cookie/session
  handling and authenticated database/private object APIs. Versions are pinned
  to a compatible pair supporting the project's Node 20 baseline.
- `yauzl`: lazy archive enumeration, filename/size validation, and bounded output
  streams; browser APIs do not provide a ZIP reader.
- `@types/yauzl`: strict server TypeScript declarations.
- `@electric-sql/pglite` (development only): executes the real PostgreSQL migration,
  RLS policies, privilege checks, and immutability triggers without external
  credentials or Docker. It does not emulate Supabase Auth/Storage services.

Run the focused installation/store/ZIP/runtime/policy tests, `npm run lint`,
`npm run typecheck`, and `npm run build -- --webpack`. Runtime HTTP tests need
permission to bind a temporary loopback port in restricted environments. Real
Supabase email delivery and the complete two-account browser walkthrough still
require acceptance against the configured project.

### Recorded verification (2026-10-20)

- `npm run typecheck`: passed.
- `npm run build -- --webpack`: passed.
- `npx vitest run --reporter=json --outputFile=/tmp/moobi-slice2-final-tests.json`:
  558 passed, 3 existing failures in `tests/settings-details.test.ts`, and one
  opt-in live test skipped. The failures expect brightness/volume labels and a
  Recharge to 100% control in unchanged Settings detail components.
- `npm run lint`: no errors; fails its zero-warning gate on existing unused
  `LuRotateCcw` in BatteryControls and `trackCount` in QueueSheet.
- `git diff --check`: passed.
- `MOOBI_LIVE_STORE_TESTS=true node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/private-store-live.test.ts`:
  passed against the real configured Supabase project and local Next server.
  It verified two-account ownership/denial, draft upload, immutable publication,
  private access grants, download/acquisition, and guest rejection. Installation
  persistence/data retention in this test uses fake IndexedDB, not Chrome storage.
  The two disposable accounts were disabled afterward. An immutable private test
  app/release remains in the project; the opt-in test intentionally creates
  remote fixtures and must not run as an ordinary unit test.
- Chrome: private account UI rendered; the separate `127.0.0.1:4100/render`
  runtime started Pocket Counter, incremented/saved through the SDK, and reported
  parent DOM, direct storage, and connection API access blocked. This does not
  establish cross-browser isolation or the full authenticated installation UI.

Production hosting, actual email confirmation, real browser quota/eviction,
full authenticated browser acceptance, independent security review, and offline
startup remain explicit follow-up gates.

References:

- [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Yauzl validation and lazy extraction](https://github.com/thejoshwolfe/yauzl)
