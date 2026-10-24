# Bundled mini-app contract

`lib/app-registry.ts` is the single source for bundled mini-app identity,
display metadata, discovery category, home placement, availability, and lazy
screen loader. `Phone.tsx`, Home, Mi Store, and App Switcher consume this
catalog. Add a mini app there and add focused registry coverage; do not add a
second route map in the phone shell.

Each entry has a stable `id`, a matching `launchTarget.screen`, name, icon,
category, description, version, availability, preview capability metadata,
home page, a `store` value, and `loadScreen` callback. Optional screenshots belong on
`previewCapabilities.screenshotUrls`. Keep IDs stable after release because
phone history and app launch targets refer to them.

Built-in phone apps use `store: null`; they remain on Home and in the App
Library but never appear in store browsing, search, filters, or recents.
Curated store apps provide a `StoreListing` with a tagline, editorial headline,
story, highlights, and screenshot captions. Store discovery uses `STORE_APPS`,
`searchStoreApps`, and `recentStoreApps`; general launcher discovery still uses
the complete registry. Use current app captures for screenshots, keep them local
and compressed, and avoid invented ratings, downloads, or installation claims.

## Lifecycle and navigation

- Phone system navigation owns the Home gesture and app switcher. Mini apps
  may implement their own inner navigation, but should not replace system
  navigation or change the active app behind the user's back.
- A screen unmounts when another app opens. Persist app data in that app's
  store when it should survive switching; transient form/animation state can
  remain local.
- The phone shell places every launched mini app inside one shared safe-area
  viewport by default. It reserves the top for the status bar and Dynamic Island, the
  bottom for the home indicator, and leaves the full screen width available.
  Apps own horizontal content spacing for headers, grouped controls, and cards.
  Keep touch targets and keyboard controls usable.
- Set `viewport: "scroll"` in the registry for screens made of vertically
  flowing content. The shell then scrolls the full display and puts top/bottom
  safe-area spacing inside the screen, allowing content to pass behind the
  transparent top bar. Do not add a nested page scroller or fixed page height.
  Settings (including About), Mi Store, and Guess use this mode. The default `contained`
  viewport keeps fixed layouts and apps with internal scrolling inside the safe
  area.
- Weather explicitly uses `viewport: "full-bleed"`. This immersive mode removes
  both shell insets and leaves scrolling with the app. Weather draws and scrolls
  behind the status bar and home indicator, with its own header and floating
  controls. It does not consume the top or bottom safe-area variables.
- Calendar also uses `viewport: "full-bleed"`, retains its own top safe-area
  spacing, and does not reserve the bottom safe area. Its floating controls use
  a fixed bottom margin, and sheets extend to the bottom edge.
- Chess uses `viewport: "full-bleed"` and applies its own top safe-area spacing.
  Its header, board, and move history scroll together. Only the bottom game
  controls stay pinned, with an app-owned bottom inset above the home indicator.
- About is an internal Settings page, not a registered mini app. It has no
  separate Home/App Library/Mi Store icon or recent-app entry.
- Treat the virtual display like a mobile screen: `--phone-safe-area-top` and
  `--phone-safe-area-bottom` come from the selected model and preview size, not
  the visitor's hardware or browser `env()` insets. The top protects the status
  row and Dynamic Island; the bottom protects the home gesture region. The shell
  applies these once to mini apps except those explicitly using `full-bleed`. Full-bleed system surfaces keep backgrounds
  edge to edge and apply their documented app-specific inset rules. Home is
  exempt from the bottom safe area: its dock uses its own 12px bottom spacing,
  and the App Library extends to the bottom. Home still respects the top inset.
- Use the phone semantic properties documented in
  [phone-theme.md](./phone-theme.md), such as `--phone-canvas`,
  `--phone-surface`, `--phone-text`, `--phone-border`, and `--phone-focus`.
- The shell shows a loader while a screen chunk loads and catches render or
  chunk errors with a recovery action. Apps own loading, empty, and error states
  for their own asynchronous data.

## Availability and untrusted extensions

`available` entries open a bundled screen. Use `preview` for unfinished routes
and provide an honest description. Camera and File Manager are not registered
and do not appear in app discovery.

Only trusted bundled screens execute in this app origin. Settings → App Sandbox
can now preview a local self-contained package in an opaque sandbox origin; see
[the slice 1 sandbox contract and security limits](mini-app-sandbox.md). This is
a local developer tool. [Private publishing and installation](private-app-store.md)
now use Supabase and a separate cookie-free runtime hostname. Public extension hosting needs
an isolated origin and a reviewed sandboxed iframe boundary, restrictive CSP,
and a schema-validated `postMessage` protocol. Do not enable `allow-same-origin`
for untrusted content or bridge arbitrary host APIs into a preview.

## Store behavior

Mi Store lists this curated bundled catalog; its separate Private apps flow
manages authorized external releases through the shared phone app resolver. Search and category filters only return
registered entries, details show their actual availability, and Open records a
recent app through the shared phone store. A preview entry opens its explanatory
screen rather than simulating installation of an app that is not present.
