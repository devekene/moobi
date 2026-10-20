"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuArrowDown,
  LuArrowLeft,
  LuArrowRight,
  LuArrowUp,
  LuArrowUpRight,
  LuCheck,
  LuChevronLeft,
  LuCircleHelp,
  LuCrown,
  LuHouse,
  LuPause,
  LuPlay,
  LuRotateCcw,
  LuTrophy,
} from "react-icons/lu";
import {
  COLUMNS,
  ROWS,
  SNAKE_MODES,
  type Direction,
  type SnakeMode,
} from "@/lib/snake";
import { useSnakeStore } from "@/stores/useSnakeStore";
import { usePhoneStore } from "@/stores/usePhoneStore";
import styles from "./snake.module.css";

const MODES: SnakeMode[] = ["mellow", "classic", "rush"];
const KEYS: Record<string, Direction | undefined> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

function Mascot() {
  return (
    <svg
      viewBox="0 0 320 225"
      fill="none"
      aria-hidden="true"
      className={styles.mascot}
    >
      <defs>
        <linearGradient
          id="snake-hero"
          x1="65"
          y1="190"
          x2="230"
          y2="45"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#278453" />
          <stop offset="1" stopColor="#83c666" />
        </linearGradient>
      </defs>
      <ellipse
        cx="159"
        cy="200"
        rx="100"
        ry="11"
        fill="#244e2c"
        opacity=".09"
      />
      <path
        d="M70 175C30 120 103 107 122 143C145 189 209 197 229 159C248 121 191 101 173 132C147 176 100 134 121 96C142 58 218 97 223 55"
        stroke="#1b5c39"
        strokeWidth="37"
        strokeLinecap="round"
      />
      <path
        d="M70 171C30 116 103 103 122 139C145 185 209 193 229 155C248 117 191 97 173 128C147 172 100 130 121 92C142 54 218 93 223 51"
        stroke="url(#snake-hero)"
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d="M72 164C53 136 82 126 97 137M140 161C164 179 193 180 210 165M135 87C155 78 181 90 196 86"
        stroke="#c0e88c"
        strokeOpacity=".55"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M214 34L210 22M214 27L204 23"
        stroke="#e98179"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse
        cx="223"
        cy="48"
        rx="24"
        ry="28"
        transform="rotate(-15 223 48)"
        fill="#8dcd70"
      />
      <ellipse cx="209" cy="37" rx="9" ry="11" fill="#fafbec" />
      <ellipse cx="231" cy="33" rx="9" ry="11" fill="#fafbec" />
      <ellipse cx="210" cy="34" rx="4" ry="6" fill="#173e2a" />
      <ellipse cx="232" cy="30" rx="4" ry="6" fill="#173e2a" />
      <path
        d="M218 56Q225 62 233 54"
        stroke="#316d43"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="205" cy="53" r="4" fill="#c5de81" />
      <path
        d="M264 106C253 95 241 110 247 121C254 135 273 134 277 120C282 107 271 101 264 106Z"
        fill="#ed8b70"
      />
      <path
        d="M263 106Q260 96 267 92"
        stroke="#57764a"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M265 98Q279 88 280 100Q271 106 265 98" fill="#7ca85a" />
      <path
        d="M58 65V77M52 71H64M275 165V175M270 170H280"
        stroke="#96ad7c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="84" cy="87" r="3" fill="#c5cda0" />
      <circle cx="254" cy="68" r="2" fill="#c5cda0" />
    </svg>
  );
}

function Board() {
  const round = useSnakeStore((state) => state.round);
  const head = round.snake[0];
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[round.direction];
  return (
    <svg
      viewBox={`0 0 ${COLUMNS * 20} ${ROWS * 20}`}
      className={styles.boardArt}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Garden board. Snake length ${round.snake.length}. Score ${round.score}.`}
    >
      <defs>
        <pattern
          id="snake-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <rect width="20" height="20" fill="currentColor" />
          <rect x="20" y="20" width="20" height="20" fill="currentColor" />
        </pattern>
        <linearGradient id="snake-body" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#96d56c" />
          <stop offset="1" stopColor="#48a464" />
        </linearGradient>
      </defs>
      <rect
        width="360"
        height="440"
        fill="url(#snake-grid)"
        className={styles.grid}
      />
      {round.snake.slice(1).map((part, index) => {
        const previous = round.snake[index];
        const adjacent =
          Math.abs(previous.x - part.x) + Math.abs(previous.y - part.y) === 1;
        return (
          <g key={`${part.x}-${part.y}`}>
            {adjacent && (
              <path
                d={`M${part.x * 20 + 10} ${part.y * 20 + 10}L${previous.x * 20 + 10} ${previous.y * 20 + 10}`}
                stroke="#64b568"
                strokeWidth="17"
                strokeLinecap="round"
              />
            )}
            <rect
              x={part.x * 20 + 1.5}
              y={part.y * 20 + 1.5}
              width="17"
              height="17"
              rx="7"
              fill="url(#snake-body)"
            />
            <circle
              cx={part.x * 20 + 7}
              cy={part.y * 20 + 6}
              r="1.5"
              fill="#c6ee9a"
              opacity=".7"
            />
          </g>
        );
      })}
      {round.food && (
        <g transform={`translate(${round.food.x * 20} ${round.food.y * 20})`}>
          <ellipse cx="10" cy="17" rx="7" ry="2" fill="#193d26" opacity=".12" />
          <path
            d="M10 6C3 2 0 9 4 15C7 20 10 17 10 17S14 20 17 14C21 6 15 2 10 6Z"
            fill="#eb856b"
          />
          <path d="M10 6Q9 2 12 1" stroke="#4d7246" strokeWidth="1.5" />
          <ellipse
            cx="14"
            cy="3"
            rx="4"
            ry="2"
            transform="rotate(-25 14 3)"
            fill="#71a65c"
          />
          <path
            d="M5 8L5 11"
            stroke="#ffd5af"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}
      <g
        transform={`translate(${head.x * 20 + 10} ${head.y * 20 + 10}) rotate(${rotation})`}
      >
        <rect x="-10" y="-9" width="21" height="18" rx="8" fill="#8ccc6a" />
        <ellipse cx="3" cy="-6" rx="5" ry="4.5" fill="#f8fbe8" />
        <ellipse cx="3" cy="6" rx="5" ry="4.5" fill="#f8fbe8" />
        <circle cx="5" cy="-6" r="2.1" fill="#244a31" />
        <circle cx="5" cy="6" r="2.1" fill="#244a31" />
        <path
          d="M11 0H15M15 0L17 -2M15 0L17 2"
          stroke="#df8b7b"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export default function SnakeGame() {
  const {
    round,
    mode,
    records,
    games,
    bestBites,
    chooseMode,
    start,
    steer,
    tick,
    pause,
    resume,
    finish,
  } = useSnakeStore();
  const [screen, setScreen] = useState<"home" | "game" | "records" | "guide">(
    () => (round.status === "ready" ? "home" : "game"),
  );
  const touch = useRef<{ x: number; y: number } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialogButton = useRef<HTMLButtonElement>(null);
  const playArea = useRef<HTMLDivElement>(null);
  const playing = screen === "game" && round.status === "playing";
  const ended = round.status === "over" || round.status === "won";
  const overlay = screen === "game" && (ended || round.status === "paused");
  const systemOverlay = usePhoneStore(
    (state) => state.showControlCenter || state.showAppSwitcher,
  );

  useEffect(() => {
    if (systemOverlay) pause();
  }, [systemOverlay, pause]);

  useEffect(() => {
    heading.current?.focus();
  }, [screen]);
  useEffect(() => {
    if (overlay) dialogButton.current?.focus();
    else if (playing) playArea.current?.focus();
  }, [overlay, playing]);
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(
      tick,
      Math.max(70, SNAKE_MODES[mode].speed - Math.floor(round.score / 50) * 5),
    );
    return () => window.clearInterval(interval);
  }, [playing, tick, mode, round.score]);
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", pause);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", pause);
      pause();
    };
  }, [pause]);
  const launch = () => {
    start();
    setScreen("game");
  };
  const goHome = () => {
    finish();
    setScreen("home");
  };

  return (
    <div className={styles.app}>
      <header className={styles.header} inert={overlay}>
        {screen === "home" ? (
          <span className={styles.brand}>
            <span className={styles.brandMark}>s.</span> LITTLE ARCADE
          </span>
        ) : (
          <button
            className={styles.iconButton}
            aria-label={screen === "game" ? "Pause game" : "Back to Snake home"}
            onClick={screen === "game" ? pause : () => setScreen("home")}
          >
            {screen === "game" ? <LuPause /> : <LuChevronLeft />}
          </button>
        )}
        <span className={styles.edition}>
          {screen === "game" ? SNAKE_MODES[mode].name : "VOL. 01"}
        </span>
        {screen === "home" ? (
          <button
            className={styles.iconButton}
            aria-label="How to play"
            onClick={() => setScreen("guide")}
          >
            <LuCircleHelp />
          </button>
        ) : (
          <span className={styles.miniBrand}>s.</span>
        )}
      </header>

      {screen === "home" && (
        <main className={styles.home}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>
              A CLASSIC, WITH A LITTLE CHARM
            </span>
            <h1 ref={heading} tabIndex={-1}>
              Snake<span>Take the long way.</span>
            </h1>
          </div>
          <div className={styles.hero}>
            <span className={styles.heroTag}>small bites. big adventures.</span>
            <Mascot />
            <span className={styles.heroNumber}>01 — THE GARDEN</span>
          </div>
          <button
            className={styles.recordCard}
            onClick={() => setScreen("records")}
          >
            <span className={styles.trophy}>
              <LuTrophy />
            </span>
            <span>
              <small>YOUR PERSONAL BEST</small>
              <strong>
                {records[mode].toString().padStart(3, "0")} <em>pts</em>
              </strong>
            </span>
            <LuArrowUpRight className={styles.recordArrow} />
          </button>
          <div className={styles.modeHeading}>
            <span>Pick your pace</span>
            <span>Make it your own</span>
          </div>
          <div
            className={styles.modes}
            role="group"
            aria-label="Game difficulty"
          >
            {MODES.map((item, i) => (
              <button
                key={item}
                aria-pressed={mode === item}
                className={mode === item ? styles.selectedMode : ""}
                onClick={() => chooseMode(item)}
              >
                <span className={styles.modeDots}>{"•".repeat(i + 1)}</span>
                {SNAKE_MODES[item].name}
                {mode === item && <LuCheck />}
              </button>
            ))}
          </div>
          <p className={styles.modeDetail}>{SNAKE_MODES[mode].detail}</p>
          <button className={styles.primary} onClick={launch}>
            Let’s play <LuArrowRight />
          </button>
          <p className={styles.footer}>
            A little focus. A little fun. One more go.
          </p>
        </main>
      )}

      {screen === "game" && (
        <main className={styles.game}>
          <div className={styles.scoreboard}>
            <div>
              <span>YOUR SCORE</span>
              <strong>{round.score.toString().padStart(3, "0")}</strong>
            </div>
            <div className={styles.best}>
              <span>
                <LuCrown /> PERSONAL BEST
              </span>
              <strong>{records[mode].toString().padStart(3, "0")}</strong>
            </div>
          </div>
          <div
            className={styles.boardWrap}
            ref={playArea}
            tabIndex={0}
            aria-label="Snake game. Use arrow keys or W A S D to steer. Space to pause."
            onKeyDown={(event) => {
              const direction = KEYS[event.key];
              if (direction && playing) {
                event.preventDefault();
                steer(direction);
              } else if (
                (event.key === " " || event.key === "Escape") &&
                playing
              ) {
                event.preventDefault();
                pause();
              }
            }}
            onPointerDown={(event) => {
              if (playing) {
                touch.current = { x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerUp={(event) => {
              if (!touch.current || !playing) return;
              const dx = event.clientX - touch.current.x,
                dy = event.clientY - touch.current.y;
              touch.current = null;
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
              steer(
                Math.abs(dx) > Math.abs(dy)
                  ? dx > 0
                    ? "right"
                    : "left"
                  : dy > 0
                    ? "down"
                    : "up",
              );
            }}
            onPointerCancel={() => {
              touch.current = null;
            }}
          >
            <Board />
            {overlay && (
              <div className={styles.overlay}>
                <div
                  className={styles.dialog}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="snake-dialog-title"
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && !ended) {
                      event.stopPropagation();
                      resume();
                    }
                    if (event.key === "Tab") {
                      const buttons =
                        event.currentTarget.querySelectorAll<HTMLButtonElement>(
                          "button",
                        );
                      const first = buttons[0],
                        last = buttons[buttons.length - 1];
                      if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                      } else if (
                        !event.shiftKey &&
                        document.activeElement === last
                      ) {
                        event.preventDefault();
                        first.focus();
                      }
                    }
                  }}
                >
                  <span className={styles.dialogIcon}>
                    {ended ? <LuTrophy /> : <LuPause />}
                  </span>
                  <span className={styles.eyebrow}>
                    {ended ? "A GOOD LITTLE ADVENTURE" : "TAKE A BREATHER"}
                  </span>
                  <h2 id="snake-dialog-title">
                    {round.status === "won"
                      ? "Garden complete!"
                      : ended
                        ? "One more bite?"
                        : "No rush."}
                  </h2>
                  <p>
                    {ended
                      ? `You scored ${round.score} points. ${round.score > 0 && round.score >= records[mode] ? "A personal best. Beautifully done." : "Every great run starts with another go."}`
                      : "Your garden will be right here."}
                  </p>
                  {ended && (
                    <div className={styles.resultScore}>
                      {round.score}
                      <small>POINTS</small>
                    </div>
                  )}
                  <button
                    ref={dialogButton}
                    className={styles.primary}
                    onClick={ended ? launch : resume}
                  >
                    {ended ? "Play again" : "Keep going"}
                    {ended ? <LuRotateCcw /> : <LuPlay />}
                  </button>
                  <button className={styles.textButton} onClick={goHome}>
                    <LuHouse /> Back to the garden
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className={styles.gameHint}>
            <span className={styles.liveDot} />
            {mode === "mellow"
              ? "No walls. Just watch your tail."
              : "Find a rhythm. Follow your curiosity."}
          </div>
          <div
            className={styles.controls}
            role="group"
            aria-label="Snake direction controls"
          >
            {(
              [
                ["left", LuArrowLeft],
                ["up", LuArrowUp],
                ["down", LuArrowDown],
                ["right", LuArrowRight],
              ] as const
            ).map(([direction, Icon]) => (
              <button
                key={direction}
                aria-label={`Move ${direction}`}
                disabled={!playing}
                onClick={() => {
                  steer(direction);
                  playArea.current?.focus({ preventScroll: true });
                }}
              >
                <Icon />
              </button>
            ))}
          </div>
          <p className={styles.controlHint}>
            SWIPE THE BOARD · ARROW KEYS · WASD
          </p>
          <span className={styles.srOnly} role="status">
            {round.status === "paused"
              ? "Game paused"
              : ended
                ? `Game complete. ${round.score} points.`
                : ""}
          </span>
        </main>
      )}

      {screen === "records" && (
        <main className={styles.subpage}>
          <span className={styles.pageIcon}>
            <LuTrophy />
          </span>
          <span className={styles.eyebrow}>A LITTLE FRIENDLY COMPETITION</span>
          <h1 ref={heading} tabIndex={-1}>
            Your best,
            <br />
            and then some.
          </h1>
          <p>Just you against yesterday’s you.</p>
          <div className={styles.recordsList}>
            {MODES.map((item, i) => (
              <div key={item}>
                <span className={styles.rank}>0{i + 1}</span>
                <span>
                  <strong>{SNAKE_MODES[item].name}</strong>
                  <small>{SNAKE_MODES[item].detail}</small>
                </span>
                <b>
                  {records[item]}
                  <small>PTS</small>
                </b>
              </div>
            ))}
          </div>
          <div className={styles.stats}>
            <div>
              <strong>{games}</strong>
              <span>GAMES STARTED</span>
            </div>
            <div>
              <strong>{bestBites}</strong>
              <span>MOST BITES IN A RUN</span>
            </div>
          </div>
          <p className={styles.savedNote}>
            Your records stay saved in this browser.
          </p>
          <button className={styles.primary} onClick={() => setScreen("home")}>
            Find your next best <LuArrowRight />
          </button>
        </main>
      )}

      {screen === "guide" && (
        <main className={styles.subpage}>
          <span className={styles.pageIcon}>
            <LuCircleHelp />
          </span>
          <span className={styles.eyebrow}>A FEW THINGS BEFORE YOU WIGGLE</span>
          <h1 ref={heading} tabIndex={-1}>
            Simple rules.
            <br />
            Endless possibilities.
          </h1>
          <div className={styles.instructions}>
            {[
              [
                "01",
                "Follow your appetite",
                "Each apple adds 10 points and a little length. Your pace gently picks up as you grow.",
              ],
              [
                "02",
                "Find your way",
                "Swipe anywhere on the board, use the direction buttons, or press arrow keys / WASD.",
              ],
              [
                "03",
                "Give yourself space",
                "Avoid your tail and the edges. In Mellow, slip through an edge and reappear on the other side.",
              ],
              [
                "04",
                "Breathe when you need to",
                "Tap pause or press Space / Esc. Leaving the game pauses your run automatically.",
              ],
            ].map(([n, title, detail]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <h2>{title}</h2>
                  <p>{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <button className={styles.primary} onClick={() => setScreen("home")}>
            Got it. Let’s grow. <LuCheck />
          </button>
        </main>
      )}
    </div>
  );
}
