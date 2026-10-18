# Moobi

**A web-based smartphone OS emulator built with Next.js. Experience a fully interactive mobile phone inside your browser. Browse, call, text, and launch apps — all in one virtual interface.**

Live: [moobi.vercel.app](https://moobi.vercel.app)

---

## 💡 Overview

Moobi aims to simulate a mobile OS experience entirely within the browser. You can install and run apps, browse locally hosted development, use music, a clock, and more. It’s also a showcase of front-end craftsmanship — blending UI/UX, dynamic imports, state orchestration, and embedded previews.

Think of it as **virtual phone meets portfolio**.

---

## ⚙️ Features

Here’s what Moobi can (or will) do:

- 📱 Multi-app environment under one persistent “frame”
- 🚀 Live dev preview: load your local `http://localhost:…` in a mobile shell
- 🧠 Dynamic screen loading (code splitting) for performance
- 🎶 Built-in music player (stream or local files)
- ⏰ Clock app (alarm, timer, stopwatch, world clock)
- 🔁 App switching / recent apps UI
- 🌗 System overlays (control center, brightness/volume)
- 🔋 Persistent virtual battery and charging simulation
- 🔧 Modular architecture for easy addition of new mini-apps
- 🪄 Smooth transitions, gestures (swipes), and animations

---

## 🧱 Tech Stack

- **Next.js** (Pages or App Router)
- **TypeScript**
- **React + Suspense / dynamic imports**
- **Zustand** for global state
- **Tailwind CSS** for styling
- **react-swipeable** (or equivalent) for gestures
- **Official / external APIs** (e.g. music, news)
- Integration of `<iframe>` and proxy for dev preview
- **Vercel** for deployment

---

## 
Each mini-app (e.g. `components/screens/clock`) can hold its own UI and possibly its own state logic (or use shared stores). The `Frame` component wraps them in the mobile phone shell.

---

## 🛠 Installation & Setup

The dependency baseline was checked with Node.js 25.8.1 and npm 11.11.0. Next.js 16 requires Node.js 20.9.0 or later; `package.json` declares this minimum.

```bash
# 1. Clone this repo
git clone https://github.com/crossdd/moobi.git
cd moobi

# 2. Install the exact dependency tree from the lockfile
npm ci

# 3. Run project checks
npm run lint
npm run typecheck
npm test
npm run build

# 4. Start the development server
npm run dev
```

### Optional API credentials

Set these in `.env.local` only for the related integrations. Core phone and app previews do not require API credentials.

- `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`, and `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` enable the Mail app. These values are exposed to the browser by design.
- `GOOGLE_SEARCH_ENGINE_ID` and `GOOGLE_SEARCH_API_KEY` enable Browser search.
- Weather uses [Open-Meteo](https://open-meteo.com/en/docs) forecasts and city geocoding without an API key. Remove the old `WEATHER_API_SECRET_KEY` if configured. The hosted free API is for non-commercial use (limits: 600 calls/minute, 5,000/hour, 10,000/day); commercial use requires a paid plan. See [terms](https://open-meteo.com/en/terms). City searches use the first matching result; coordinate lookups display coordinates because reverse geocoding is unavailable. Forecasts are cached for 10 minutes and city lookups for 24 hours. Weather alerts and air quality are not requested. Weather owns a full-display viewport and scrolls behind both system bars. Its detail cards use live forecast fields (including UV, precipitation, lunar events, and pressure). The precipitation chart is a point forecast; the optional OpenStreetMap view has no radar layer, and historical averages are not displayed.
- `GNEWS_API_KEY` enables News results.

### Weather locations

Weather opens to a saved-location list. Search for a city or postcode to add and
open its forecast; the list button returns to your locations. The options menu
supports current location, refresh, Celsius/Fahrenheit, removal, and keyboard
reordering. Current location requires explicit browser permission and stays first.
City searches use the first geocoding match; add a country qualifier for ambiguous
names. Airport-code search and voice input are not supported.

Up to 20 locations, their latest compact summaries, ordering, and units are saved
through the shared encrypted storage boundary. Full hourly forecasts stay in
memory. The Home widget shows the saved current location, or the first saved
city, and opens that forecast when tapped. It uses saved summaries immediately
after reload and refreshes only its displayed location when needed. Summaries refresh when the visible list opens or the tab returns after
10 minutes, with at most two requests in flight. Failed updates keep the saved
summary and show a retry action. Maps remain pending.

### Calendar

Calendar opens to a Monday-first, scrolling year overview. Select a month, then a
date to open its day timeline. The top view control switches between timeline and
agenda; Today returns to the current date in the active view. Dates from 1900
through 2100 are supported. Hour labels open a new event at that time. Calendar
keeps the top safe area and extends to the bottom edge without a bottom safe-area inset.

Create, edit, reschedule, search, and delete local all-day or timed events. Events
are saved through the shared encrypted browser storage boundary. The selected
date and view survive app switching in the current session. Notes todos retain
one source of truth in Notes, including completion state; Calendar does not copy
them into events. Calendars controls visibility of local events, included
holidays, and todos. Included holidays are the existing fixed collection, not a
live or regional holiday feed. Calendar accounts, recurring events, invitations,
notifications, and external sync are not implemented.

### Dependency and validation baseline

On 2026-10-13, the original installed tree passed `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Its initial `npm audit` reported 30 advisories (1 critical, 23 high, 4 moderate, 2 low). The current tree uses Next.js 16.4.0, Tailwind CSS 4.3.3, Math.js 15.2.0, and Sharp 0.35.5; the latest audit reports 5 high advisories, all in the Next.js ESLint configuration dependency tree. In the restricted validation runner, Turbopack could not bind its CSS worker port; `npm run build -- --webpack` completed successfully. Recheck with `npm audit` before release because advisory data changes over time.

Tests cover phone navigation, app registry behavior, persisted system settings, device geometry, rotation, and the virtual battery model.

### Home Screen wallpaper

Open Settings → Wallpaper to choose a local JPEG, PNG, WebP, or AVIF (up to 15 MB), preview it, or restore the bundled default. Images are processed locally, resized to a maximum 1920px edge, and saved as encrypted image bytes in IndexedDB (`moobi-wallpaper`, `images`, key `home`). No image is uploaded or stored as base64 in localStorage. The centered image fills the Home Screen; the Lock Screen is separate. Theme and navigation state are preserved.

The wallpaper belongs to this browser and site origin, with no account sync. Clearing site data or browser storage eviction removes it; private browsing may discard it at session end. Failed reads show the bundled default, and failed saves retain the current wallpaper with a retryable message in Settings. The default retains the theme's wallpaper opacity; custom photos display at full opacity.

### Browser storage security

App-owned saved state and wallpaper now use AES-256-GCM encryption, with automatic
migration of existing data and visible read/save failure handling. The key stays
in this browser as a non-exportable CryptoKey. This offers protection against
casual storage inspection; same-origin scripts and a compromised browser profile
can still access decrypted data. Losing the key database makes saved data
unrecoverable. See [storage security](docs/browser-storage-security.md) for the
scope, limits, migration behavior, and persistence authoring contract.

### Virtual device simulations

The app switcher shows overlapping recent-app cards over the Home Screen wallpaper. Open it from Phone options or the Home indicator's slow upward swipe. Tap a card to return, swipe it upward or use its labelled close button to remove it, and use Home, Done, or Close all for the corresponding action. Arrow keys browse focused cards and Escape dismisses the switcher.

App previews are best-effort frozen captures taken when leaving an app or opening the switcher, using the existing lazily loaded image-capture utility. At most eight preview images are kept in memory for the session; closing an app releases its image. Missing or unsupported captures show a labelled app fallback. Embedded browser frames, media elements, and password fields are excluded. These previews are not live apps, do not preserve app-local state by themselves, and are never saved to browser storage or uploaded.

The frame's volume, Action, side/power, and Camera Control buttons operate the virtual phone. Volume and Silent mode affect Moobi's music and gallery video only; they do not control the visitor's operating-system audio or physical phone.

Battery drain, charging, and the charging cable are simulations owned by the virtual phone. Battery level persists in this browser, drains only while the Moobi tab is visible, and can be recharged or reset from Control Center. Moobi never reads or changes the actual device battery or charging hardware.
## 🧠 How Moobi Works (Architecture Notes)

Here’s a quick dive into how the magic is wired:

### ✅ Frame & Root Shell
- The `Frame` component is always mounted.
- Inside it, the active screen (home, browser, clock, etc.) is swapped using **Zustand** + **dynamic imports**.

### ✅ State Management via Zustand
- `usePhoneStore` handles navigation and control center state like:
    - `currentScreen`
    - `history`
    - control center visibility
- `usePhoneSettingsStore` owns persistent phone-level display and sound settings:
    - brightness
    - virtual media volume
    - silent mode
- App-specific stores (e.g., music, notes) manage only their internal states.

### ✅ Dynamic Imports & Memoization
- Each screen UI is **lazily loaded** to keep bundles lightweight.
- Once a screen is loaded, it’s memoized, so re-opening it won’t trigger the loader again.

### ✅ Live Dev Preview / Browser Mode
- URLs (e.g., `http://localhost:3000`) are embedded using an `<iframe>`.
- Proxy/headers may be used to bypass embed restrictions.

### ✅ Gesture Handling & UI Transitions
- Swipes (e.g., swipe-up to Home or AppSwitcher) handled with `react-swipeable` + custom logic.
- Transitions and animations rely on **CSS, Framer motion, and Motion**.

### ✅ App Registry & Metadata
- `lib/app-registry.ts` owns typed app IDs, launch targets, icons, categories,
  descriptions, versions, availability, home placement, and lazy screen loaders.
- Home, Mi Store, and App Switcher read from the same registry. Camera and File
  Manager are not registered.
- See [the bundled mini-app contract](./docs/mini-app-contract.md) before adding
  an app. User-submitted code is not executed in the main app origin.

## 👥 Contributing

Moobi is MIT-licensed and open to collaboration.

### ✅ How to Contribute

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature
   ```
3. **Run lint/tests and verify functionality**
4. Submit a pull request
   Include a clear, concise description of your changes

   `Please use ESLint + Prettier for consistent formatting`
