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
- `WEATHER_API_SECRET_KEY` enables live Weather data.
- `GNEWS_API_KEY` enables News results.

### Dependency and validation baseline

On 2026-10-13, the original installed tree passed `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Its initial `npm audit` reported 30 advisories (1 critical, 23 high, 4 moderate, 2 low). The current tree uses Next.js 16.4.0, Tailwind CSS 4.3.3, Math.js 15.2.0, and Sharp 0.35.5; the latest audit reports 5 high advisories, all in the Next.js ESLint configuration dependency tree. In the restricted validation runner, Turbopack could not bind its CSS worker port; `npm run build -- --webpack` completed successfully. Recheck with `npm audit` before release because advisory data changes over time.

Tests cover phone navigation, app registry behavior, persisted system settings, device geometry, rotation, and the virtual battery model.

### Home Screen wallpaper

Open Settings → Wallpaper to choose a local JPEG, PNG, WebP, or AVIF (up to 15 MB), preview it, or restore the bundled default. Images are processed locally, resized to a maximum 1920px edge, and saved as a Blob in IndexedDB (`moobi-wallpaper`, `images`, key `home`). No image is uploaded or stored as base64 in localStorage. The centered image fills the Home Screen; the Lock Screen is separate. Theme and navigation state are preserved.

The wallpaper belongs to this browser and site origin, with no account sync. Clearing site data or browser storage eviction removes it; private browsing may discard it at session end. Failed reads show the bundled default, and failed saves retain the current wallpaper with a retryable message in Settings. The default retains the theme's wallpaper opacity; custom photos display at full opacity.

### Virtual device simulations

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
  Manager are explicitly labeled preview placeholders.
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
