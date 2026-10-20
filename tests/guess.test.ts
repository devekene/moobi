import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createSession,
  guess,
  limitFor,
  nextRound,
  PUZZLES,
  revealHint,
  sessionScore,
} from "@/lib/guess";
import { createGuessStore } from "@/stores/useGuessStore";
import GuessGame from "@/components/screens/guess/GuessGame";

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
describe("Guess puzzle rules", () => {
  it("creates five unique puzzles with one correct answer in shuffled options", () => {
    for (const mode of ["emoji", "word", "number"] as const) {
      const session = createSession(mode, "casual", () => 0.4);
      expect(session.rounds).toHaveLength(5);
      expect(new Set(session.rounds.map((r) => r.puzzle.id)).size).toBe(5);
      for (const r of session.rounds) {
        if (mode !== "number")
          expect(
            r.puzzle.options.filter((a) => a === r.puzzle.answer),
          ).toHaveLength(1);
        else expect(Number(r.puzzle.answer)).toBeGreaterThanOrEqual(1);
      }
    }
    for (const bank of Object.values(PUZZLES))
      for (const p of bank) expect(new Set(p.options).size).toBe(4);
  });
  it("ignores empty, fabricated and repeated answers without consuming attempts", () => {
    let session = createSession("word", "casual");
    expect(guess(session, "")).toBe(session);
    expect(guess(session, "made up")).toBe(session);
    const wrong = session.rounds[0].puzzle.options.find(
      (a) => a !== session.rounds[0].puzzle.answer,
    )!;
    session = guess(session, wrong);
    expect(guess(session, wrong)).toBe(session);
    expect(session.rounds[0].guesses).toHaveLength(1);
  });
  it("validates whole number bounds, provides directional clues and parity hints", () => {
    const session = createSession("number", "expert", () => 0.5);
    for (const value of ["0", "101", "2.5", "-1", "3a", "NaN", "01"])
      expect(guess(session, value)).toBe(session);
    const answer = Number(session.rounds[0].puzzle.answer);
    const value = answer === 100 ? 99 : answer + 1;
    expect(guess(session, String(value)).feedback).toContain(
      value < answer ? "higher" : "lower",
    );
    expect(session.rounds[0].puzzle.hint).toContain(
      answer % 2 === 0 ? "even" : "odd",
    );
  });
  it("charges hints once, accounts for mistakes and prevents scoring twice", () => {
    let session = createSession("emoji", "casual");
    const puzzle = session.rounds[0].puzzle;
    session = revealHint(revealHint(session));
    session = guess(
      session,
      puzzle.options.find((a) => a !== puzzle.answer)!,
    );
    session = guess(session, puzzle.answer);
    expect(session.status).toBe("result");
    expect(sessionScore(session)).toBe(60);
    expect(guess(session, puzzle.answer)).toBe(session);
    expect(revealHint(session)).toBe(session);
  });
  it("ends unsuccessful rounds at the attempt limit and resets feedback on next round", () => {
    let session = createSession("word", "expert");
    expect(limitFor(session)).toBe(2);
    for (const answer of session.rounds[0].puzzle.options
      .filter((a) => a !== session.rounds[0].puzzle.answer)
      .slice(0, 2))
      session = guess(session, answer);
    expect(session.status).toBe("result");
    expect(sessionScore(session)).toBe(0);
    session = nextRound(session);
    expect(session.index).toBe(1);
    expect(session.feedback).toBe("");
    expect(session.rounds[1].guesses).toEqual([]);
    expect(nextRound(session)).toBe(session);
  });
});
describe("Guess sessions and records", () => {
  it("counts a finished session exactly once and persists records without live answers", async () => {
    const storage = memory();
    const store = createGuessStore(storage);
    await store.persist.rehydrate();
    store.getState().start("word", "casual");
    for (let i = 0; i < 5; i++) {
      const session = store.getState().session!;
      store.getState().submit(session.rounds[i].puzzle.answer);
      store.getState().next();
    }
    store.getState().next();
    store.getState().submit("anything");
    expect(store.getState()).toMatchObject({
      best: 500,
      solved: 5,
      played: 1,
      session: { status: "finished" },
    });
    const restored = createGuessStore(storage);
    await restored.persist.rehydrate();
    expect(restored.getState()).toMatchObject({
      best: 500,
      solved: 5,
      played: 1,
      session: null,
    });
    expect(storage.data.get("moobi-guess")).not.toContain("rounds");
    store.getState().start("number", "expert");
    store.getState().leave();
    expect(store.getState()).toMatchObject({ played: 1, session: null });
  });
  it("keeps hints, guesses, and app switching in memory without rewriting records", async () => {
    const storage = memory();
    const store = createGuessStore(storage);
    await store.persist.rehydrate();
    store.getState().start("number", "casual");
    await Promise.resolve();
    const writes = storage.setItem.mock.calls.length;
    const session = store.getState().session!;
    store.getState().hint();
    store.getState().submit(session.rounds[0].puzzle.answer);
    store.getState().next();
    await Promise.resolve();
    expect(store.getState().session?.index).toBe(1);
    expect(storage.setItem).toHaveBeenCalledTimes(writes);
  });
  it("validates corrupt saved records", async () => {
    const storage = memory();
    storage.data.set(
      "moobi-guess",
      JSON.stringify({
        state: { best: 9999, solved: -2, played: "5" },
        version: 0,
      }),
    );
    const store = createGuessStore(storage);
    await store.persist.rehydrate();
    expect(store.getState()).toMatchObject({ best: 500, solved: 0, played: 0 });
  });
  it("renders an immediate, understandable mode picker and difficulty controls", () => {
    const html = renderToStaticMarkup(createElement(GuessGame));
    for (const text of [
      "Take a guess.",
      "Emoji Decoder",
      "Hidden Words",
      "Number Hunt",
      'aria-label="How to play"',
      'aria-pressed="true"',
    ])
      expect(html).toContain(text);
  });
});
