# Encrypted browser storage

Moobi's app-owned localStorage values and saved wallpaper use authenticated
AES-256-GCM encryption through the browser's Web Crypto API. This is automatic;
there is no password prompt or new account requirement. HTTPS (or localhost) and
IndexedDB access are required. Encryption never falls back to plaintext.

## Protection and limits

This protects against casual inspection of stored values and detects changed
ciphertext or values moved to another record. It is not an independently audited
vault, a replacement for operating-system disk encryption, or end-to-end encryption.
The app can decrypt automatically because the key is stored in the same browser
profile. Same-origin malicious scripts, XSS, sufficiently privileged extensions,
and someone controlling that profile can use the key or read live app memory.
`extractable: false` prevents Web Crypto key export; it does not promise hardware
protection or make a copied/compromised profile safe.

Names of databases, stores and keys, ciphertext lengths, and wallpaper MIME types
remain visible. Encryption does not prevent deletion or replay of an older valid
record. The virtual phone PIN is a simulation feature, not the encryption key or
an independent cryptographic lock.

For stronger protection against profile theft, a separate passphrase-unlocked
vault would need a deliberate unlock, recovery, and password-change design. Do
not derive a vault key from the short simulated phone PIN.

## Implementation

- `lib/encrypted-storage.ts` owns string encryption and the Zustand storage adapter.
  Each encryption gets a fresh random 96-bit IV and a 128-bit authentication tag.
  Version and record identity are bound through the envelope and authenticated
  context; unsupported envelopes are rejected. String ciphertext is base64 encoded.
- A random, non-exportable AES key is persisted as a structured-cloned `CryptoKey`
  at `moobi-security` / `keys` / `installation-v1`. Atomic read/write transactions
  ensure simultaneous first-use tabs choose the same key. No key is embedded in
  source, environment variables, or localStorage. Raw key export is never used.
- `lib/wallpaper.ts` encrypts image bytes and authenticates their MIME type and
  database/store/key identity. It waits for transaction commit before reporting
  success. The image is decrypted to an in-memory Blob for display.
- All eight persisted stores use the shared asynchronous adapter: Notes/tasks,
  phone appearance, phone settings, battery simulation, virtual device, Home
  ordering, music, and Weather locations/summaries. The website's legacy `theme` preference uses it too.
- `StorageBoundary` hydrates stores before mounting consumers. Failed reads show
  a retry screen, retain the original stored records, and block replacement writes
  to the unreadable key. Failed writes retain the latest pending value in memory,
  show an accessible error, and offer **Retry saving** without reloading unsaved
  edits. Pending writes are lost if the tab closes before a successful save.
- Operations are queued per record within a tab. Web Locks, when supported, also
  serialize current-version tabs. There is no cross-tab state merge: independently
  edited app state still follows last successful write wins. Browsers without
  Web Locks have only per-tab ordering; close other tabs during migration.

## Migration and recovery

Existing valid JSON values migrate on first read by replacing the same key only
after successful encryption. Legacy raw `dark`/`light`/`system` website themes are
normalized to JSON. Existing wallpaper Blobs migrate when wallpaper is loaded.
A failed migration preserves its original record; there is no separate plaintext
backup. Close older Moobi tabs when updating, since old application code can still
write legacy values. Third-party browser/extension keys and browser HTTP caches
are outside this app-owned persistence boundary and are not modified.

Clearing site data, losing the `moobi-security` database, or browser eviction can
make encrypted data permanently unreadable. There is no recovery key, server
backup, or account sync. Do not delete just the key database. If browser storage
has been cleared while a tab is open, reload before saving more data. Corrupted
records are retained for investigation rather than automatically reset. Wallpaper
can be explicitly replaced or reset in Settings.

## Adding persistence

Use `encryptedStorage` with Zustand's `createJSONStorage`. Register additional
persisted stores in `StorageBoundary` and defer their hydration until that boundary
runs. Use `browserCipher` for binary persistence, with a unique authenticated
context for the database/store/record and any decoding metadata. Do not add direct
localStorage writes or plaintext IndexedDB payloads. Never await encryption inside
an active IndexedDB transaction: encrypt first, then commit the ciphertext.

## Validation

`npm test` covers authenticated encryption, Unicode/binary round trips, unique
IVs, wrong keys, swapped records, tampering, unsupported versions, serialization,
migration failures, retries, and actual Notes store restoration. The test-only
`fake-indexeddb` dependency exercises transaction ordering, simultaneous key
creation, key persistence, and wallpaper migration/reload with Web Crypto. It
provides the IndexedDB semantics missing from the Node test environment; it is
not shipped as application runtime code. These tests do not replace cross-browser
checks of storage permissions, eviction, private browsing, or quota behavior.

Run `npm run lint`, `npm run typecheck`, and `npm run build -- --webpack` as well.
The cryptographic foundation follows the
[W3C Web Cryptography API](https://www.w3.org/TR/webcrypto/); this document does
not claim a security certification or a star rating.
