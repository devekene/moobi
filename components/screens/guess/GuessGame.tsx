"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuChevronRight,
  LuCircleHelp,
  LuFlame,
  LuHouse,
  LuLightbulb,
  LuRotateCcw,
  LuSparkles,
  LuTarget,
  LuTrophy,
  LuX,
} from "react-icons/lu";
import {
  MODES,
  limitFor,
  sessionScore,
  type Difficulty,
  type GuessMode,
} from "@/lib/guess";
import { useGuessStore } from "@/stores/useGuessStore";
import styles from "./guess.module.css";

function MysteryArt({ small = false }: { small?: boolean }) {
  return (
    <div
      className={`${styles.art} ${small ? styles.artSmall : ""}`}
      aria-hidden="true"
    >
      <span className={styles.orbit} />
      <span className={styles.orbitTwo} />
      <span className={styles.sparkOne}>✧</span>
      <span className={styles.sparkTwo}>✦</span>
      <div className={styles.question}>?</div>
      <span className={styles.artTile}>Aa</span>
      <span className={styles.numberTile}>42</span>
    </div>
  );
}

export default function GuessGame() {
  const { session, played, solved, best, start, submit, hint, next, leave } =
    useGuessStore();
  const [screen, setScreen] = useState<"play" | "guide" | "stats">("play");
  const [difficulty, setDifficulty] = useState<Difficulty>("casual");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [exitOpen, setExitOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const exitCancel = useRef<HTMLButtonElement>(null);
  const previousView = useRef("");
  const view = `${screen}-${session?.status ?? "home"}-${session?.index ?? 0}-${exitOpen}`;
  useEffect(() => {
    if (previousView.current) {
      if (exitOpen) exitCancel.current?.focus();
      else heading.current?.focus();
    }
    previousView.current = view;
  }, [view, exitOpen]);
  const begin = (mode: GuessMode) => {
    start(mode, difficulty);
    setInput("");
    setError("");
  };
  const goNext = () => {
    next();
    setInput("");
    setError("");
  };
  const round = session?.rounds[session.index];
  const isFinished = session?.status === "finished";
  const submitNumber = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d+$/.test(input) || Number(input) < 1 || Number(input) > 100) {
      setError("Enter a whole number from 1 to 100.");
      return;
    }
    const value = String(Number(input));
    if (round?.guesses.includes(value)) {
      setError("Already tried that one. Choose a new number.");
      return;
    }
    submit(value);
    setError("");
    setInput("");
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button
          className={styles.brand}
          onClick={() => {
            if (session && !isFinished && screen === "play") setExitOpen(true);
            else {
              setScreen("play");
              if (isFinished) leave();
            }
          }}
          aria-label="Guess home"
        >
          <span className={styles.brandMark}>
            g<span>✦</span>
          </span>
          <span>
            guess<span className={styles.brandDot}>.</span>
          </span>
        </button>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            aria-label="Your records"
            onClick={() => setScreen(screen === "stats" ? "play" : "stats")}
          >
            <LuTrophy />
          </button>
          <button
            className={styles.iconButton}
            aria-label="How to play"
            onClick={() => setScreen(screen === "guide" ? "play" : "guide")}
          >
            <LuCircleHelp />
          </button>
        </div>
      </header>

      {exitOpen ? (
        <section className={styles.panel} aria-labelledby="guess-exit-title">
          <LuHouse className={styles.largeIcon} />
          <h1 ref={heading} tabIndex={-1} id="guess-exit-title">
            Leave this session?
          </h1>
          <p>Your round progress will be lost. Your saved records will stay.</p>
          <button
            ref={exitCancel}
            className={styles.primary}
            onClick={() => setExitOpen(false)}
          >
            Keep playing <LuArrowRight />
          </button>
          <button
            className={styles.secondary}
            onClick={() => {
              leave();
              setExitOpen(false);
            }}
          >
            Leave session
          </button>
        </section>
      ) : screen !== "play" ? (
        <section className={styles.info}>
          <button className={styles.back} onClick={() => setScreen("play")}>
            <LuArrowLeft /> {session ? "Back to game" : "Back to discovery"}
          </button>
          <p className={styles.eyebrow}>
            {screen === "guide" ? "A LITTLE KNOW-HOW" : "EVERY GUESS COUNTS"}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {screen === "guide" ? "Find your aha." : "Your little victories."}
          </h1>
          {screen === "guide" ? (
            <>
              <p>
                Five puzzles. A few clues. That lovely moment when it all
                clicks.
              </p>
              <div className={styles.instructions}>
                {[
                  [
                    "01",
                    "Pick your kind of curious",
                    "Decode emoji combinations, solve word riddles, or hunt a secret number.",
                  ],
                  [
                    "02",
                    "Make the connection",
                    "Choose an answer. In Number Hunt, enter 1–100 and follow higher or lower clues.",
                  ],
                  [
                    "03",
                    "Need a little nudge?",
                    "Reveal a hint for 25 points. Each wrong guess costs 15 points; a solved puzzle earns at least 20.",
                  ],
                  [
                    "04",
                    "Find your rhythm",
                    "Casual gives 4 guesses (8 for numbers). Expert gives 2 (6 for numbers). No timer. Take your time.",
                  ],
                ].map(([n, title, text]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <section>
                      <h2>{title}</h2>
                      <p>{text}</p>
                    </section>
                  </div>
                ))}
              </div>
              <button
                className={styles.primary}
                onClick={() => setScreen("play")}
              >
                Let’s play <LuArrowRight />
              </button>
            </>
          ) : (
            <>
              <MysteryArt small />
              <div className={styles.records}>
                <div>
                  <LuTrophy />
                  <strong>{best}</strong>
                  <span>Best session / 500</span>
                </div>
                <div>
                  <LuCheck />
                  <strong>{solved}</strong>
                  <span>Puzzles solved</span>
                </div>
                <div>
                  <LuTarget />
                  <strong>{played}</strong>
                  <span>Sessions finished</span>
                </div>
              </div>
              <p className={styles.note}>
                Records are saved in this browser. Finish all five rounds to set
                a record.
              </p>
            </>
          )}
        </section>
      ) : !session ? (
        <>
          <section className={styles.intro}>
            <p className={styles.eyebrow}>
              <span /> SMALL PUZZLES. BIG AHA.
            </p>
            <h1 ref={heading} tabIndex={-1}>
              Stay curious.
              <br />
              <span>Take a guess.</span>
            </h1>
            <p>
              A little intuition. A little imagination.
              <br />
              What will you figure out today?
            </p>
            <MysteryArt />
          </section>
          <div className={styles.sectionHeading}>
            <h2>Pick your playground</h2>
            <span>3 ways to play</span>
          </div>
          <div className={styles.modeList}>
            {(Object.keys(MODES) as GuessMode[]).map((mode, i) => (
              <button
                className={`${styles.modeCard} ${styles[mode]}`}
                key={mode}
                onClick={() => begin(mode)}
              >
                <span className={styles.modeSymbol}>
                  {mode === "emoji" ? "🧩" : MODES[mode].symbol}
                </span>
                <span className={styles.modeCopy}>
                  <span className={styles.modeTitle}>
                    {MODES[mode].name}
                    {i === 0 && <span className={styles.tag}>START HERE</span>}
                  </span>
                  <span>{MODES[mode].description}</span>
                </span>
                <LuChevronRight />
              </button>
            ))}
          </div>
          <div className={styles.difficulty} aria-label="Difficulty">
            <button
              aria-pressed={difficulty === "casual"}
              onClick={() => setDifficulty("casual")}
            >
              <LuSparkles /> Casual
            </button>
            <button
              aria-pressed={difficulty === "expert"}
              onClick={() => setDifficulty("expert")}
            >
              <LuFlame /> Expert
            </button>
          </div>
          <p className={styles.note}>
            {difficulty === "casual"
              ? "Room to explore. No rush, just discovery."
              : "Fewer guesses. A little more challenge."}
          </p>
        </>
      ) : isFinished ? (
        <section className={styles.results}>
          <p className={styles.eyebrow}>FIVE ROUNDS. NICELY DONE.</p>
          <MysteryArt small />
          <h1 ref={heading} tabIndex={-1}>
            {session.rounds.every((r) => r.solved)
              ? "A beautiful clean sweep."
              : "Curiosity looks good on you."}
          </h1>
          <p>
            {MODES[session.mode].name} ·{" "}
            {session.difficulty === "casual" ? "Casual" : "Expert"}
          </p>
          <div className={styles.finalScore}>
            <span>SESSION SCORE</span>
            <strong>
              {sessionScore(session)}
              <small> / 500</small>
            </strong>
            <span>
              {sessionScore(session) > 0 && sessionScore(session) === best
                ? "✦ Personal best"
                : `${session.rounds.filter((r) => r.solved).length} of 5 puzzles solved`}
            </span>
          </div>
          <div className={styles.recap}>
            {session.rounds.map((r, i) => (
              <div key={r.puzzle.id}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{r.puzzle.answer}</strong>
                <span>
                  {r.solved ? (
                    <LuCheck aria-label="Solved" />
                  ) : (
                    <LuX aria-label="Missed" />
                  )}
                </span>
                <b>{r.score}</b>
              </div>
            ))}
          </div>
          <button
            className={styles.primary}
            onClick={() => begin(session.mode)}
          >
            <LuRotateCcw /> Play another set
          </button>
          <button className={styles.secondary} onClick={leave}>
            Explore other games <LuArrowRight />
          </button>
        </section>
      ) : round ? (
        <section className={styles.game}>
          <div className={styles.gameTop}>
            <button
              className={styles.iconButton}
              aria-label="Leave session"
              onClick={() => setExitOpen(true)}
            >
              <LuArrowLeft />
            </button>
            <span>
              {MODES[session.mode].name}
              <small>
                {session.difficulty === "casual" ? "Casual" : "Expert"} session
              </small>
            </span>
            <span className={styles.score}>
              <LuSparkles /> {sessionScore(session)}
            </span>
          </div>
          <div
            className={styles.progress}
            aria-label={`Round ${session.index + 1} of 5`}
          >
            {session.rounds.map((r, i) => (
              <span
                key={r.puzzle.id}
                data-current={i === session.index}
                data-done={i < session.index}
              />
            ))}
          </div>
          <div className={styles.roundMeta}>
            <span>ROUND 0{session.index + 1} / 05</span>
            <span>{limitFor(session) - round.guesses.length} guesses left</span>
          </div>
          <h1 ref={heading} tabIndex={-1} className={styles.gameTitle}>
            {session.mode === "emoji"
              ? "What’s the connection?"
              : session.mode === "word"
                ? "What am I?"
                : "Find my number."}
          </h1>
          <div className={`${styles.puzzleCard} ${styles[session.mode]}`}>
            <span
              className={
                session.mode === "emoji"
                  ? styles.emojiVisual
                  : styles.puzzleVisual
              }
              aria-hidden="true"
            >
              {round.puzzle.visual}
            </span>
            {session.mode === "emoji" && (
              <span className="sr-only">Emoji clue: {round.puzzle.visual}</span>
            )}
            <p>{round.puzzle.clue}</p>
            {session.mode === "word" && (
              <span className={styles.letterCount}>
                {round.puzzle.answer.replace(/\s/g, "").length} letters
                {round.puzzle.answer.includes(" ") ? " · 2 words" : ""}
              </span>
            )}
          </div>
          <div aria-live="polite" className={styles.feedback}>
            {session.feedback || "Trust that first spark of an idea."}
          </div>
          {session.status === "result" ? (
            <div className={styles.reveal} data-solved={round.solved}>
              <span>
                {round.solved ? <LuCheck /> : <LuLightbulb />}
                {round.solved
                  ? `+${round.score} points`
                  : "A new thing to know"}
              </span>
              <h2>{round.puzzle.answer}</h2>
              <p>{round.puzzle.hint}</p>
              <button className={styles.primary} onClick={goNext}>
                {session.index === 4 ? "See my results" : "Next puzzle"}
                <LuArrowRight />
              </button>
            </div>
          ) : (
            <>
              {session.mode === "number" ? (
                <form onSubmit={submitNumber} className={styles.numberForm}>
                  <label htmlFor="guess-number">
                    Your guess <span>1–100</span>
                  </label>
                  <div>
                    <input
                      id="guess-number"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g. 50"
                      aria-describedby={error ? "guess-error" : undefined}
                      aria-invalid={!!error}
                    />
                    <button
                      className={styles.primary}
                      type="submit"
                      aria-label="Submit guess"
                    >
                      <LuArrowRight />
                    </button>
                  </div>
                  {error && (
                    <p id="guess-error" role="alert">
                      {error}
                    </p>
                  )}
                  {round.guesses.length > 0 && (
                    <div
                      className={styles.numberHistory}
                      aria-label="Previous guesses"
                    >
                      {round.guesses.map((g) => (
                        <span key={g}>
                          {g}{" "}
                          {Number(g) < Number(round.puzzle.answer) ? "↑" : "↓"}
                        </span>
                      ))}
                    </div>
                  )}
                </form>
              ) : (
                <div className={styles.answers}>
                  {round.puzzle.options.map((answer, i) => (
                    <button
                      disabled={round.guesses.includes(answer)}
                      key={answer}
                      onClick={() => submit(answer)}
                    >
                      <span>{String.fromCharCode(65 + i)}</span>
                      {answer}
                      {round.guesses.includes(answer) && (
                        <LuX aria-label="Incorrect" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button
                className={styles.hint}
                onClick={hint}
                disabled={round.hinted}
              >
                <LuLightbulb />
                {round.hinted ? round.puzzle.hint : "A little hint"}
                {!round.hinted && <span>−25 pts</span>}
              </button>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
