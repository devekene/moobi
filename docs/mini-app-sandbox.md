# External mini-app sandbox: slice 1

Status: slice 1 local developer preview contract. Accounts, ZIP uploads, and
private installation are now implemented in [slice 2](private-app-store.md).
Public submissions and release updates remain on the [roadmap](app-store-platform-plan.md).
When a runtime origin is configured, previews use that separate service; the
local preview tool alone can use an opaque srcdoc frame without it.

## Try it

Open the virtual phone's **Settings → App Sandbox → Start preview**. Pocket
Counter is an external web package, not an imported React screen. Increment it,
stop the preview, and reopen: its value should persist in this browser. Expand
Isolation check to see whether parent DOM, direct browser storage, and the
connection API are blocked (the connection probe uses a data URL, not a remote service).
Send Back exercises the SDK back event. Switching tabs emits pause/resume.

Download sample package produces an editable `.moobi.json` file. Choose preview
package validates a local file without uploading it to a server. Loading another
package requires an explicit Start preview action. Packages themselves remain in
memory and are forgotten on refresh; encrypted app data remains in this browser.

## Version 1 package contract

```json
{
  "formatVersion": 1,
  "manifest": {
    "id": "example.counter",
    "name": "Pocket Counter",
    "version": "1.0.0",
    "sdkVersion": 1,
    "entry": "index.html",
    "permissions": ["storage"]
  },
  "files": {
    "index.html": "<main><h1>Hello Moobi</h1></main>",
    "app.css": "body { background: var(--phone-canvas); color: var(--phone-text); }",
    "app.js": "moobi.ready.then(() => console.log('Ready'));"
  }
}
```

- Maximum envelope size: 256 KiB in UTF-8, checked before parsing.
- The optional `manifest.storageVersion` is a positive integer (omission means 1);
  [slice 3](public-app-store.md) blocks updates that change this declaration.
- Exact keys and three text files only. Unknown fields, permissions, files,
  traversal paths, unsupported format/SDK versions, and non-text files are rejected.
- IDs match `[a-z][a-z0-9.-]{2,63}`; names are nonempty and at most 60 characters.
- Versions are three numeric components, without leading zeros; each component
  has at most six digits. Prerelease/range syntax is not supported yet.
- `index.html` supplies body markup. Put behavior in `app.js` and styles in
  `app.css`. Inline event handlers/scripts, external imports, eval, external
  assets, and network APIs are unsupported by this prototype's document CSP.
- `storage` is the only supported permission; an empty permission list is valid.

The parser returns canonical key order. SHA-256 over the normalized package
identifies its content; release identity will be app ID + version + digest.
The local file chooser shows this digest. It is not a publisher signature or
publication record. The slice 2 server enforces immutable version identity.

## SDK v1

The bootstrap exposes a non-replaceable `window.moobi` object inside the frame:

```js
await moobi.ready;
const value = await moobi.storage.get("count"); // string or null
await moobi.storage.set("count", "1");
await moobi.storage.remove("count");
const environment = moobi.getEnvironment();
const unsubscribe = moobi.onEvent((event, value) => {
  // environment, launch, pause, resume, back
});
```

`ready` resolves after document load and the host handshake. Register lifecycle
listeners before awaiting it to observe launch. Environment includes explicit
phone theme, shared semantic tokens, reduced-motion preference, and content
safe-area insets. Insets are zero because Settings already receives the shell's
safe-area viewport; do not apply phone insets twice. The frame owns its internal
scrolling. Theme/model changes do not replace the running document.

Lifecycle events are cooperative notifications, not forced suspension of
arbitrary JavaScript. Document hiding and phone overlays notify pause/resume.
Leaving Settings or stopping removes the frame, revokes the session, and attempts
a final pause notification; unmount delivery is not guaranteed. Persist important
changes before lifecycle teardown. Back is a host-triggered app event; system
navigation remains owned by Moobi.

Requests use channel `moobi-preview-v1`, random session ID, increasing integer
request ID (1–1,000,000), method, and the exact method-specific fields. Methods:
`ready`, `fault`, `storage.get`, `storage.set`, `storage.remove`. Responses echo
channel/session/request ID, with `ok` and either `value` or `error`. No caller-
supplied app identity or arbitrary host method is accepted. The frame authenticates
the parent's source/origin; the host authenticates the exact frame, opaque origin,
and session together. The host bounds requests to 30/second and one storage
operation in flight. The SDK bounds outstanding requests and times out after 5s.

## Storage contract

The host derives app identity from the validated package. Storage uses the shared
AES-GCM cipher and Web Locks, plus an in-process per-app queue. It does not use
the shared adapter's retrying success semantics: SDK writes reject unless the
encrypted write actually succeeds.

- Dedicated namespace: `moobi-external-preview:v1:<app-id>`.
- Values: strings, at most 4 KiB each. Keys: 1–64 ASCII letters, digits, `_`, `-`;
  prototype-related names are rejected.
- Quota: 32 keys and 32 KiB of serialized plaintext per app.
- Existing unreadable ciphertext is preserved; errors do not silently reset data.
- Encryption authenticates the namespace, preventing record swapping between apps.
- Versions share app data by stable app ID; no migration API exists yet.
- Different local packages claiming the same app ID share its preview data.
  There is no publisher ownership verification in this local tool. Production
  app ownership and storage namespaces require authenticated catalog records.
- Data does not sync to another browser/device. Clearing browser storage removes it.

## Security design review and limits

This is an implementation threat review, not an independent security audit or
approval for public untrusted submissions.

| Boundary             | Implementation                                                                                                                                      | Remaining limitation                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Host origin          | `srcdoc` with `sandbox="allow-scripts"`; no `allow-same-origin`                                                                                     | Creates an opaque isolated origin, not a separately deployed runtime site                                  |
| Host data            | No DOM, cookies, authentication tokens, arbitrary host APIs, or other-app storage in the bridge                                                     | Browser-side encryption does not protect against compromised trusted host code                             |
| Document resources   | Fixed CSP before package markup: default/connect/frame/worker/object/media/font sources denied; only data images/CSS/scripts and hashed SDK allowed | Not a general network firewall; iframe self-navigation can initiate requests                               |
| Navigation           | Top navigation, popups, forms and downloads not granted; base URI denied; subsequent frame load closes bridge and removes frame                     | Self-navigation is detected after load; do not claim all navigation requests are prevented                 |
| Browser capabilities | Camera, microphone, location, screen capture, clipboard, payments and device APIs denied in iframe policy                                           | Browser support varies; verify supported browsers before public release                                    |
| Bridge               | Exact source + opaque origin + random session, strict schemas, replay rejection, permissions, quotas and request limits                             | Malicious code can still flood window messages before validation                                           |
| Recovery             | Host-owned stop/back, 8s startup timeout, runtime error handling, frame teardown                                                                    | Infinite loops/memory abuse may affect the tab; iframe sandboxing does not guarantee CPU/process isolation |
| Package bytes        | Size/schema limits, data-encoded code, fixed CSP                                                                                                    | Developer code is intentionally executable inside the sandbox; validation is not malware detection         |

Before public submissions: deploy and review a dedicated runtime site with no
Moobi credentials, response-header CSP/sandbox and controlled package serving;
review navigation, cookies, origin isolation, resource abuse, authentication,
review policy, and SDK capabilities. Do not weaken the sandbox to make an app
compatible. There is no public package execution endpoint in this slice.

## Offline-serving design

The validated package is assembled into a self-contained document: its CSS and
JavaScript use data URLs, its bootstrap is inline and hash-authorized, and storage
is host-side. Restarting a package already in memory needs no package HTTP fetch.
Resource-dependency tests verify this property.

The Moobi PWA now supports offline startup for a narrowly allowlisted public
shell; see [PWA and offline boundary](./pwa.md). Its service worker deliberately
excludes API routes, package responses, authenticated data, and the separate
mini-app runtime. The local preview does not persist package bytes. Slice 2
persists installed packages and atomically manages records, but its session and
separate runtime still require network access. Offline shell startup therefore
does not promise offline installation or launch for mini apps.

## Validation

Focused tests cover package validation/digest, CSP construction, frame/session
authentication, schema and permission rejection, stale/in-flight sessions, rate
limits, encrypted persistence, namespace isolation, quotas, failed writes, and
concurrent writes. Browser verification and check results are recorded with the
slice handoff; static tests alone do not prove browser sandbox enforcement.

Slice 1 checks (2026-10-20):

- Focused Vitest run across `mini-app-{package,bridge,storage,sdk}`, registry,
  and Settings header tests: **61 passed**.
- Full Vitest run (`npx vitest run --reporter=json --outputFile=/tmp/moobi-slice1-tests.json`):
  **513 passed, 3 failed**. Existing failures in `settings-details.test.ts` expect
  brightness/volume label markup and a Recharge to 100% action absent from the
  unchanged SettingsDetails/BatteryControls sources.
- `npm run typecheck`: passed.
- ESLint on all new TypeScript files and the modified Settings screen: passed.
- `npm run lint`: blocked by existing unused imports in
  `components/screens/BatteryControls.tsx` (`LuRotateCcw`) and
  `components/screens/music-player/QueueSheet.tsx` (`trackCount`).
- `npm run build -- --webpack`: passed.
- Chrome on localhost: launched sample, incremented/saved counter, sent Back,
  stopped preview, reloaded the whole page, reopened and observed the saved value.
  Isolation check reported parent DOM, direct storage, and connection API blocked.
  Switching browser tabs and returning showed the resume lifecycle event.
- Not independently browser-verified: arbitrary local file selection, runtime
  crash/navigation recovery, light theme, model changes, reduced motion, other
  browsers, or full offline site startup. Unit checks cover the underlying
  package/bridge/SDK/storage contracts; public release needs broader browser tests.

References:

- [MDN srcdoc and sandbox origin behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc)
- [MDN CSP directives and navigation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [MDN channel messaging](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API/Using_channel_messaging)
