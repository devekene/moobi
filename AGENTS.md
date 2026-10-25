# Project instructions

These instructions apply to the entire Moobi repository. Read them before changing code. The product direction and staged scope are defined in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md); keep changes aligned with that plan and preserve the current slice boundaries.

## Product goal

Moobi is a platform for adding and previewing mini apps, with a virtual phone playground as its main presentation. Make it feel responsive, tactile, coherent, and premium while keeping it fast. Phone state and hardware behavior are browser simulations; never imply access to the user's actual phone hardware when the browser does not provide it.

## Required engineering workflow

1. Inspect the owning component, shared state, app registry, and nearby conventions before editing. Fix behavior at its shared owner instead of adding screen-local workarounds.
2. Keep each change scoped to the requested slice. Avoid drive-by refactors and unrelated dependency additions.
3. Use strict TypeScript. Do not add `any`, suppressions, ignored lint rules, or broad casts to make a check pass. If a narrow exception is unavoidable, document why at the point of use.
4. Add or update focused tests for changed state, navigation, registry, persistence, and other behavior with meaningful edge cases. Prefer tests of observable behavior over snapshots and implementation details.
5. Before handing off implementation work, run the available focused tests, lint, TypeScript check, and production build as applicable. The dependency-baseline slice must establish and document reliable commands for all four. Report commands and results accurately; distinguish an existing failure from a regression and never claim an unrun check passed.
6. Inspect the final diff for scope, accidental generated files, credentials, and unrelated work. Preserve existing user changes.

## Lightweight implementation

- Prefer platform APIs, CSS, and existing dependencies for straightforward behavior. Add a library only when it materially improves capability, accessibility, reliability, or maintenance.
- Keep the first screen quick: load the phone shell and initial app first, and lazy-load optional apps, large media, and expensive effects.
- Avoid unnecessary client state, repeated polling, background work, large image payloads, and animation loops. Pause or reduce work when the document is hidden.
- For performance-sensitive changes, measure or profile the relevant path and state the scope of evidence. Do not make unsupported “fast” claims.
- Add graceful empty, loading, and error states for async work; do not leave blank screens when optional APIs or credentials are unavailable.

## Design system and themes

- Use semantic design tokens for all shared phone UI. Support explicit light and dark phone themes independently of the surrounding website theme.
- New mini apps must use the shared phone tokens and app contract. Do not introduce isolated color systems or theme-specific literal colors.
- Preserve contrast, clear hierarchy, visible focus, accessible labels, and usable touch targets in both themes.
- Keep app-specific styling local when it is truly unique; move a pattern into shared UI only after it is reused or is part of the platform contract.

## Realistic phone behavior

- Treat device models as selectable **virtual iPhone shells**, not guesses about the visitor's real phone. Use browser viewport and safe-area measurements to decide which virtual models can be presented at a usable size. Keep model dimensions and front/back details in a typed catalog, and verify model specifications before adding them.
- Switching virtual iPhone models must update the visible device proportions and model-specific front/back details without losing the active app or phone state. Re-evaluate available options when the viewport changes.
- Keep system state (theme, battery simulation, brightness, volume, recents, and navigation) in the system layer. Keep each mini app's internal state with that app unless it must survive app switching or is explicitly system-wide.
- State transitions must be predictable and must not silently reset an app. Preserve active app state during device presentation changes such as front/back rotation.
- Simulated battery drain, charger connection, signal, Wi-Fi, calls, or other device-like behavior must be clearly modeled and deterministic enough to test. Do not inspect or alter the visitor's actual battery, radio, or phone state.
- Avoid fake controls: every visible interactive system control must change observable state, open a clear explanation, or be presented as unavailable/preview. Do not imply that a simulated Wi-Fi or screen-recording control changes the real browser connection or records the user's screen.
- Handle visibility changes and elapsed time deliberately; background tabs must not cause surprising simulation behavior.
- Keep app registration typed, discoverable, and centralized. A new bundled mini app should not require unrelated edits throughout the system.
- Never execute arbitrary user-submitted mini-app code on the main app origin. Design and review a sandbox boundary before supporting untrusted extensions.

## Motion and 3D

- Motion should communicate cause and system state, feel restrained and consistent, and keep the interface immediately usable. Use transform/opacity when suitable and avoid blocking interaction while an animation runs.
- Honor `prefers-reduced-motion` for transitions, continuous effects, device rotation, and charging animations. Provide a useful static or low-motion presentation.
- Support pointer, touch, and keyboard alternatives for device rotation and other gesture-based features. Gestures must not be the only way to perform a core action.
- Prefer CSS 3D and optimized assets for device presentation. Add a WebGL/3D dependency only after demonstrating that lighter approaches cannot meet the requirement.
- Keep device front/back changes reversible and avoid unmounting the active mini app. Account for GPU cost, small screens, and unavailable 3D acceleration.

## Accessibility and responsive behavior

- Apply mobile layout rules within the virtual display: respect the shared
  `--phone-safe-area-top` and `--phone-safe-area-bottom` for interactive content.
  Backgrounds may bleed to the edges. Mini apps already receive the shell's
  safe-area viewport; do not apply those insets twice. Home is exempt from the
  bottom safe area and owns its dock spacing; retain its top safe area.
  Flowing mini-app screens can declare `viewport: "scroll"` in the registry;
  the shell places safe-area spacing inside their full-display scroller so
  content can scroll behind the transparent top bar. Do not nest another page
  scroller or add a fixed page height in this mode.
- Support narrow and short viewports, orientation changes, touch and mouse input, and keyboard operation for core flows.
- Use semantic controls, accessible names, focus management, visible focus, and status announcements for important simulated events such as low battery and charging.
- Avoid relying only on color, motion, hover, or sound to convey state.
- Do not sacrifice interaction or readability to reproduce a hardware detail.

## Dependency and documentation discipline

- Keep `package.json` and `package-lock.json` synchronized. Review framework and runtime compatibility before major upgrades; group changes so regressions can be isolated.
- Do not add a dependency for convenience alone. Record the capability it provides and why the current stack is insufficient.
- Keep setup, required environment variables, validation commands, app-author instructions, and simulation limits accurate in project documentation.
- Do not commit secrets, local credentials, build output, or generated assets unless the task specifically requires them.

## Handoff requirements

Summarize what changed, why, and which checks were run. Include known limitations, unverified device/browser behavior, and follow-up work when relevant. Link the plan or files that changed. Keep claims proportional to the evidence.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
