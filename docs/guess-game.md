# Guess

Guess is a bundled, offline puzzle arcade in the existing core mini-app slice.
Its registry ID and shared scroll viewport remain `guess` and `scroll`.

- Emoji Decoder and Hidden Words each have 12 curated puzzles. Each session
  draws five unique puzzles and shuffles the answer choices.
- Number Hunt draws five distinct numbers from 1–100. Higher/lower feedback
  follows each valid guess; the hint reveals parity.
- Casual allows four guesses per word/emoji puzzle and eight per number.
  Expert allows two and six respectively. There is no timer.
- A solved puzzle earns 100 points minus 15 per incorrect guess and 25 if a
  hint was revealed, with a minimum of 20. Missed puzzles earn zero.
- Completing five rounds updates finished-session count, total puzzles solved,
  and best session score. These records use the shared encrypted storage and
  hydrate through `StorageBoundary`. They are local to this browser.
- Active sessions survive app switching in memory. Reloading
  starts at discovery; active puzzles and answers are not persisted.

Rules and puzzle content belong in `lib/guess.ts`, session/record transitions
in `stores/useGuessStore.ts`, and presentation in `components/screens/guess`.
The artwork uses lightweight CSS, with semantic phone theme tokens for UI and
reduced-motion support. No API keys, network service, or new dependencies.

Focused checks: `npm run test -- tests/guess.test.ts tests/app-registry.test.ts`.
Repository checks: `npm run lint`, `npm run typecheck`, and
`npm run build -- --webpack`.
