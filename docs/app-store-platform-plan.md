# Moobi app store platform plan

Recorded: 2026-10-20.

Status: slices 1–3 are implemented in code: package sandbox, private publishing
and installation, public review/discovery, account libraries, and safe updates.
Slice 3 database rollout and reviewer setup remain required. Production deployment,
security review, and full browser acceptance remain gates. GitHub publishing is next.

## Goal and current foundation

Developers publish versioned mini apps. Users discover and install them in their
virtual phone. Moobi manages distribution, launch, storage, permissions, and updates.

The [registry](../lib/app-registry.ts) defines trusted bundled apps. A shared
[phone app resolver](../lib/phone-apps.ts) also resolves account-scoped installed
packages across Home, App Library, recents, and the switcher. Mi Store includes a
separate private publishing/library flow; its curated bundled catalog remains explicit.

This roadmap extends [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), especially
Slice 3. See the [bundled contract](mini-app-contract.md), [package sandbox contract](mini-app-sandbox.md),
and [private publishing setup](private-app-store.md) for the implemented boundaries.

## Release principle

**A repository push is not a user update.** Developers can change source code all
day. Users receive an update only after an explicit release is published and
approved through Moobi's publication process.

Releases are immutable: version `1.0.0` always identifies the same package bytes.
Changed files require a new version. Installations pin an exact release rather
than following a repository branch or a mutable website URL.

## What developers upload

Start with packaged web mini apps: HTML, CSS, JavaScript, and assets. React, Vue,
and other frameworks are acceptable when their build produces a supported static
package. Native iOS/Android binaries require a different runtime and are outside
the initial scope.

| Submission item | Contents                                                               |
| --------------- | ---------------------------------------------------------------------- |
| Manifest        | Stable app ID, version, entry file, supported SDK version, permissions |
| Built package   | Executable web files and assets                                        |
| Store listing   | Name, description, icon, screenshots, category                         |
| Release notes   | Changes in this release                                                |

Apps needing server functionality keep their backend separately. Downloadable
packages must not contain secrets; upload checks cannot guarantee detection of
every accidentally embedded credential.

## Publishing paths

### Start with ZIP upload

1. Developer signs in and creates an app listing under their account or team.
2. Developer uploads the built package and release metadata.
3. Moobi validates ownership, manifest, compatibility, files, size limits, archive
   paths, and decompression limits.
4. Moobi creates a private preview inside the virtual phone.
5. Developer tests the preview and submits the release.
6. Automated checks and an initial manual review approve or reject publication.
7. Approval publishes an immutable release to the catalog.

Drafts and previews remain separate from public releases. Automated checks are a
layer of review, not a guarantee that an app is safe.

### Add GitHub integration later

Developers connect a repository through a GitHub App with scoped access. A
published release or explicit deployment action submits a build. Ordinary pushes
do not update users. Use verified release webhooks instead of polling repositories.

Pin builds to an exact commit and run them in isolated workers with resource
limits and no access to Moobi production secrets. Handle duplicate events and
retries without creating conflicting releases. Both publishing paths feed the
same validation, preview, review, and publication pipeline.

## Hosting and distribution

Users download from Moobi-controlled release storage/CDN, not directly from a
developer's changing repository. Keep supported older packages for pinned installs
and recovery. Prevent overwriting published files and verify downloads against
integrity metadata from a trusted release record.

```text
ZIP upload / GitHub release
            |
            v
Validate -> Private preview -> Review
                                |
                                v
                    Immutable release storage
                                |
                                v
                         Store catalog
                                |
                                v
                 Install -> Virtual phone -> Open
```

Embedding a developer's live website can be a separately labeled preview, but it
cannot provide controlled versioned updates: its owner can change it independently
of Moobi publication and review.

## Installation and library

| Concept             | Meaning                                                        |
| ------------------- | -------------------------------------------------------------- |
| Catalog             | Apps and approved releases available in the Store              |
| Account library     | Apps a signed-in user has acquired                             |
| Device installation | Exact release installed in this browser's virtual phone        |
| App data            | User data scoped to that app with an explicit retention policy |

Get downloads and verifies the release, prepares local files, commits the
installation record, and adds the icon to Home and App Library. Show Open only
after success. Interrupted downloads must not create working-looking installs.

Account libraries can sync across devices. Downloaded files and offline
availability remain browser-specific. Browser storage may be cleared or evicted;
detect missing files and offer a download again. Installation does not guarantee
offline access to features that require external services.

Uninstall must explain whether app data is retained or deleted. Define guest
installs, sign-in/sign-out behavior, and account transitions before library sync.

## Sandbox runtime and SDK

Never import uploaded JavaScript as a trusted React component or execute it in
Moobi's main origin. Use an isolated origin, sandboxed iframe, restrictive CSP,
and a narrow, schema-validated messaging protocol.

The current mini-app contract prohibits `allow-same-origin` for untrusted
previews. Retain that restriction unless a reviewed security design explicitly
revises the contract. Sandbox restrictions affect storage, fetches, and offline
execution: prove those together in the first runtime slice.

The initial Moobi SDK should expose:

- App-scoped storage with quotas.
- Theme and safe-area information.
- Launch, pause, resume, and back events.
- Explicitly granted capabilities as they are introduced.

The host derives identity from the running app session and validates every
request, permission, and payload. Do not trust an app ID supplied in a message.
Bind the bridge to its frame/session; an opaque sandbox origin alone does not
identify an app. Never expose Moobi login tokens or other apps' storage.

Keep Home, close, and recovery controls outside app control. Define allowed
network access, navigation, downloads, and browser capabilities. Test resource
abuse and failure recovery; an iframe alone does not guarantee resource isolation.

## Updates

| Action                              | User experience                              |
| ----------------------------------- | -------------------------------------------- |
| Developer pushes source code        | Installed app remains unchanged              |
| Developer creates a private preview | Installed app remains unchanged              |
| Approved release is published       | Update becomes available                     |
| Automatic updates enabled           | Prepare update and activate at a safe launch |
| User selects manual update          | Download, verify, and activate the release   |
| Download or verification fails      | Existing version remains usable              |

Never replace a release underneath an active session. Stage the new package
separately, verify it, and commit activation atomically at a safe launch.
Coordinate open tabs/sessions to avoid incompatible versions corrupting shared data.

- Check SDK compatibility before installation and update.
- Require user approval for expanded permissions before activation.
- Preserve app data across compatible updates.
- Version data migrations and define failure handling and recovery.
- Keeping the previous package does not automatically reverse migrated data.
- Developers must keep backends compatible with supported older clients.
- Define supported-version and mandatory-update policies before enforcing updates.
- Provide suspension/revocation with a clear explanation. Offline browsers learn
  about new revocations only when they reconnect.

## Platform components

| Component                  | Responsibility                                                 |
| -------------------------- | -------------------------------------------------------------- |
| Accounts and teams         | Identity, app ownership, publishing authorization              |
| Catalog database/API       | Listings, releases, review state, permissions                  |
| Object storage/CDN         | Packages, icons, screenshots, integrity metadata               |
| Submission workers         | Validation, isolated builds, automated checks                  |
| Developer dashboard        | Upload, preview, release notes, submission status              |
| Review dashboard           | Approve, reject, suspend, revoke, audit history                |
| Sandbox runtime/SDK        | Isolated execution and approved host capabilities              |
| Installation manager       | Download, verification, caching, activation, update, uninstall |
| Store/launcher integration | Get/Open/Update states and installed app icons                 |

Keep bundled apps in the existing registry. Add a typed external-app launch
target and shared resolver. Server metadata must be serializable; it cannot
contain React icon components or screen-loader callbacks from the bundled registry.

## Delivery slices

### 1. Package contract and sandbox

Implementation and security review notes: [mini-app sandbox](mini-app-sandbox.md).
Local preview now uses an opaque sandbox origin. A separately deployed runtime
site and production offline installation remain gates for public submissions.

- [x] Define manifest, content-based release identity, SDK protocol, and compatibility rules.
- [x] Document sandbox/CSP, bridge identity, network policy, and production hosting gates.
- [x] Run one external sample package inside the virtual phone.
- [x] Implement app-scoped storage, lifecycle, theme, and safe-area integration with focused tests.
- [x] Check isolation/recovery boundaries and document the self-contained offline-serving design.

Evidence and limits: see [slice 1 validation](mini-app-sandbox.md#validation).
These checks establish a local prototype, not public-hosting security approval,
cross-browser certification, or durable offline installation.

### 2. Private publishing and installation

- [x] Add developer identity, ownership checks, and private app records.
- [x] Implement ZIP upload, validation, immutable storage, and private previews.
- [x] Implement Get, download progress, Open, and Uninstall.
- [x] Integrate installed apps into Home, App Library, recents, and switching.
- [x] Test failed writes/downloads, account interruption, corrupt/missing records, and retained/deleted app data.
- [ ] Complete production deployment and broader browser acceptance, including actual browser storage eviction.

Evidence: [slice 2 setup, validation, and limits](private-app-store.md). Real
Supabase ownership/publication/acquisition was tested with two disposable
accounts. Full offline startup and runtime launch remain unimplemented.

### 3. Public Store and updates

- [x] Add review, public publication, and catalog discovery.
- [x] Add account libraries with explicit guest and cross-device behavior.
- [x] Implement manual and optional automatic updates with safe activation.
- [x] Require permission confirmation, block unsupported schema migrations/SDKs, and retain a recovery package.
- [ ] Apply the production migration, configure reviewer accounts, and complete hosted/full-browser acceptance.

Implementation, setup, supported migration limits, and acceptance walkthrough:
[Public Store and updates](public-app-store.md). No arbitrary saved-data migration
script API is exposed. Full offline launch remains outside the implemented slice.

- [x] Add suspension/revocation and clear failure states.

### 4. GitHub publishing

- [ ] Add scoped GitHub App connections and verified webhooks.
- [ ] Build pinned commits in isolated workers.
- [ ] Route artifacts through the existing submission pipeline.
- [ ] Verify retries, duplicates, build failures, and repository disconnection.

## First complete milestone

Upload `1.0.0`, preview it, install it, save app data, publish `1.1.0`, update,
and verify that saved data remains. A failed update leaves `1.0.0` usable. A source
push alone does not change the installed release.

## Open decisions and scope

- Supabase is selected for Auth, metadata, and private package storage; production
  runtime/CDN and future GitHub build-worker hosting still need deployment choices.
- Package/SDK v1, numeric release versions, package limits, and app-data quotas are
  defined; future SDK capabilities and reviewed schema migrations remain open.
- Secure package serving and offline caching compatible with the sandbox.
- Review policy, supported-version policy, permissions, and network access.
- Guest support, app-data sync, uninstall retention, and account transitions.

Payments, subscriptions, native binaries, and arbitrary server deployment are
outside the initial slices. Revisit after installation and updates work end to end.

Each implementation slice needs focused behavior tests, lint, TypeScript checks,
and a production build, plus browser evidence for sandbox, download, persistence,
and update behavior. Documentation alone does not establish these capabilities.

## References

- [GitHub release webhooks](https://docs.github.com/en/webhooks/webhook-events-and-payloads#release)
- [MDN iframe sandbox behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
