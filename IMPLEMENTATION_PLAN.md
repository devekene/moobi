# Moobi refactor and expansion plan

## Product direction

The external-app publishing, installation, and update roadmap is documented in
[App store platform plan](docs/app-store-platform-plan.md). It extends this plan
with staged delivery slices. Local previews and Supabase-backed private publishing
and installation are implemented; see [setup and limits](docs/private-app-store.md).
Public review/discovery and safe release updates are implemented in code; complete
the [slice 3 database and reviewer setup](docs/public-app-store.md) to enable them.

Moobi is a browser-based mini-app platform first and a virtual phone playground second. A visitor should be able to open the phone, try useful and playful mini apps, and eventually add or preview mini apps of their own. The phone should feel responsive and coherent enough to invite exploration, without making the experience heavy or pretending browser capabilities it does not have.

The product should combine:

- A believable, interactive virtual phone with persistent settings and state.
- A curated set of polished first-party mini apps.
- A safe, documented path for registering and previewing new mini apps.
- A desktop and mobile presentation that makes the phone and its platform purpose clear.

“Real phone experience” means convincing interaction and clear simulation boundaries. Battery, charging, connectivity, and hardware controls are simulated in-browser. They must not imply actual device capabilities, network access, or background behavior the browser cannot provide.

## Principles and completion bar

- Keep the initial experience fast: load the shell and first screen first; lazy-load optional apps and expensive media.
- Prefer browser-native APIs and CSS for simple work. Add a dependency only when it provides clear value over a small, maintainable implementation.
- Keep shared phone behavior in the phone/system layer, app behavior in its mini app, and the app registration contract in one shared registry.
- Use responsive layout and input-independent interaction: mouse, touch, keyboard where appropriate, and accessible labels/focus states.
- Make motion purposeful, short, interruptible, and consistent. Honor `prefers-reduced-motion`; avoid animation that blocks interaction.
- Use persistent, explicit light and dark phone themes. Theme every phone surface through semantic tokens rather than scattering literal colors through components.
- Treat performance, accessibility, correctness, and visual quality as acceptance criteria, not follow-up polish.
- Do not silently expand a slice into unrelated app rewrites. Preserve existing behavior unless a slice explicitly changes it.

## Staged implementation

### Slice 1 — Dependency update and baseline

This is the first implementation slice. Establish what is installed, update dependencies deliberately, and leave a reproducible baseline before visual or architecture changes.

Tasks:

1. Record current Node/npm expectations, lockfile state, direct dependencies, and known build/lint/type issues.
2. Review outdated and vulnerable packages. Update compatible patch/minor releases together; handle framework, React, Tailwind, motion, and major-version changes in individually reviewable groups.
3. Keep `package-lock.json` in sync and remove unused direct dependencies only when repository usage confirms they are unused.
4. Make project checks explicit and runnable: lint, TypeScript check, production build, and a test command. Add a lightweight test setup if none exists; begin with tests around shared phone state and app registration rather than broad snapshot coverage.
5. Resolve regressions introduced by the dependency changes and document external API/environment requirements. Do not hide or reclassify pre-existing failures as passing.

Acceptance:

- Clean install from the lockfile succeeds.
- Lint, typecheck, focused tests, and production build commands are documented and runnable.
- Dependency changes are scoped, reviewable, and free of unexplained major upgrades.
- Baseline failures and credentials needed for API-backed features are recorded.

### Slice 2 — Light and dark phone design tokens

This is the second implementation slice and the first visual-system change.

Tasks:

1. Define semantic tokens for phone shell, screen canvas, primary/secondary text, muted text, surfaces, elevated surfaces, borders, focus, accent, status indicators, and overlays.
2. Provide explicit light and dark token sets, applied to a phone-level theme root. Keep the page/marketing theme separate from the simulated phone theme.
3. Replace literal colors in the shell, home screen, status bar, control center, and shared UI primitives with semantic tokens as the initial migration surface.
4. Add a user-selectable phone appearance setting (light, dark, and optionally system) with persistence. Ensure switching themes does not reset the active app or phone state.
5. Define token naming and usage examples so new mini apps inherit the theme by default.

Acceptance:

- Both themes have readable text, visible focus, clear surfaces, and consistent contrast across the initial migration surface.
- Theme choice survives refresh and does not interfere with the website theme.
- No new shared phone surface relies on ad hoc hard-coded theme colors.
- Reduced-motion and theme switching have focused coverage where behavior is stateful.

### Slice 3 — Mini-app platform contract and navigation

Make app discovery and previewing the core platform workflow.

Tasks:

1. Consolidate app metadata into a typed registry: stable ID, name, icon, category, launch target, description, version, preview capabilities, and optional screenshots.
2. Identify routes currently mapped to placeholders (including camera and file manager) and label them honestly until implemented.
3. Define a mini-app contract for lifecycle, navigation/back behavior, safe-area layout, theme tokens, loading/error states, and app metadata.
4. Improve home/app-library organization, search, app details, recently opened apps, and empty/loading states.
5. Define the extension boundary: trusted bundled apps first; document a sandboxed preview strategy before accepting arbitrary user code. Do not execute arbitrary submitted JavaScript in the main application origin.

Acceptance:

- Every visible app entry launches a real screen or is clearly marked unavailable/in preview.
- Apps can be discovered and previewed without breaking system navigation.
- New bundled apps can be added through the registry and documented contract without editing unrelated phone-shell code.
- User-provided code is isolated behind a reviewed security design before implementation.

### Slice 4 — Premium responsive phone shell

Replace the fixed demo frame with a responsive, tactile, carefully composed device experience. The visitor chooses a **virtual iPhone model**; Moobi does not guess the visitor's physical phone model. Use the available browser viewport to determine which virtual device options can be shown at a usable size.

Tasks:

1. Create a typed iPhone model catalog with verified model-specific dimensions, aspect ratios, front/back details, and minimum usable preview sizes. Start with iPhones only.
2. Make the phone adapt to viewport width, height, safe areas, and orientation while preserving the selected virtual model's credible proportions. Filter or disable catalog options that cannot be presented at the minimum usable size in the current viewport; do not infer the visitor's physical model from viewport dimensions.
3. Add the device picker inside the virtual phone's Settings app. Changing models updates the shell, proportions, and model-specific details while preserving the active app and system state. Keep presentation controls out of the surrounding page.
4. Refine frame materials, glass, bezels, speaker/camera details, buttons, shadows, reflections, and surrounding stage. Keep the frame lightweight and readable at small sizes.
5. Make home, lock screen, status bar, dock, widgets, and control center feel like one operating system.
6. Add accessible input handling, visible focus, pointer/touch affordances, and robust small-screen fallbacks.
7. Define a motion system for launch, dismiss, page changes, lock/unlock, overlays, and app switching. Use transform/opacity where possible, keep transitions interruptible, and honor reduced motion.

Acceptance:

- The phone fits common narrow and short viewports without clipping core controls.
- Only virtual iPhone models that can meet the minimum usable preview size are offered for the current viewport; users can switch among available models.
- Each model's front-facing shell matches its catalog design and proportions, and switching models preserves app and phone state.
- Interactions remain responsive during transitions; motion never traps or delays the user.
- Keyboard and screen-reader users can identify and operate major system controls.
- Visual checks cover desktop, narrow mobile, landscape, both themes, and reduced motion.

### Slice 5 — 3D device and hardware details

Render each selected virtual iPhone as a polished, front-facing 3D shell without placing a separate control console around the phone.

Tasks:

1. Build front and back geometry/details from the selected iPhone catalog entry, using CSS 3D transforms and layered, optimized assets where possible; use WebGL/3D libraries only if CSS cannot meet the visual requirement.
2. Keep the active phone front-facing and immediately usable. Model selection belongs in Settings; do not add turn, reset, refresh, screenshot, or navigation strips outside the chassis.
3. Design the rear camera array, materials, logo/mark, side buttons, and charging port as part of the same device system.
4. Preserve the current app and state when switching device models.
5. Respect reduced motion and provide a static device presentation when 3D effects are unavailable or costly. If the selected model no longer fits after a viewport change, select an available model without resetting phone state.

Acceptance:

- The device remains front-facing and usable without surrounding presentation controls.
- The device remains crisp without excessive GPU use or large blocking assets.
- Model changes do not unmount apps or lose their state.

### Slice 6 — Simulated battery and charging

Implement battery as transparent, deterministic simulation state rather than a claim about the visitor’s physical device.

Tasks:

1. Define a battery model with capacity, drain rules, charging state, low-battery threshold, and persistence. Make drain rate configurable and slow enough to support exploration.
2. Drain only while the Moobi experience is active/visible; account for tab visibility and elapsed time so background tabs do not cause surprising loss.
3. Add battery status to the system UI and a low-battery prompt with a clear dismiss/charge action. Avoid repeated nagging after dismissal.
4. Connect a charger animation from an explicit charging action to the rendered charging port. Provide a clear unplug action and accessible state feedback.
5. Provide a reset/recharge path for demos and testing. Do not request or inspect the real device’s battery status.

Acceptance:

- Battery state is predictable, persists as designed, and is testable with a controllable clock/timer.
- Low battery is announced accessibly and does not interrupt an active task without an explicit action.
- Charger animation follows the port, works with reduced motion, and updates charging state only after a successful connection interaction.
- Simulation is identified as virtual in help/about copy.

### Slice 7 — Core mini-app quality and system integration

Bring a focused set of apps to a premium standard before expanding breadth.

Tasks:

1. Choose a small launch set based on value to platform previews (for example Notes, Calendar, Browser, Music, Weather, and one game).
2. Give each chosen app consistent empty, loading, error, and populated states; keyboard support; responsive layout; and theme tokens.
3. Ensure app state, recent-app behavior, back navigation, notifications, and system overlays cooperate.
4. Make unavailable APIs degrade gracefully with clear copy and no broken/blank screens.
5. Add new mini apps through the established contract and show them in discovery and preview surfaces.

Acceptance:

- A complete first-use path works from boot/unlock through discovery, launch, interaction, app switching, and return home.
- API failures and missing credentials are recoverable and understandable.
- Focused tests cover important state transitions and app-registry behavior.

### Slice 8 — Final performance, accessibility, and release pass

Tasks:

1. Measure production bundle, startup, screen transitions, image weight, and runtime responsiveness before and after optimization.
2. Keep first paint focused on the phone shell and first screen; lazy-load optional apps, large images, and expensive 3D effects.
3. Audit contrast, focus order, labels, reduced motion, touch target sizing, and screen-reader announcements.
4. Verify representative browsers and viewport sizes; document browser capability limits and any required API keys.
5. Update README with platform purpose, app-author workflow, architecture, setup, validation commands, and simulation boundaries.

Acceptance:

- Lint, typecheck, focused tests, and production build pass.
- Performance and accessibility issues found in the release pass are fixed or documented with a concrete follow-up.
- The experience remains usable without optional APIs, 3D acceleration, or motion.

## Suggested delivery order

1. Dependency update and validation baseline.
2. Light/dark phone tokens and persisted phone appearance.
3. Typed app registry and platform contract.
4. Responsive premium phone shell and motion system.
5. Front-facing 3D device.
6. Simulated battery and charging.
7. Focused mini-app polish and app-author preview workflow.
8. Performance, accessibility, documentation, and release verification.

Each numbered slice should land as a small reviewable change with its own acceptance evidence. Do not start later slices until earlier shared contracts are stable, unless the user explicitly changes the order.
