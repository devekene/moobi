"use client";

import { useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { useReducedMotion } from "framer-motion";
import { Chessboard } from "react-chessboard";
import {
  LuArrowLeft,
  LuChevronLeft,
  LuChevronRight,
  LuFlag,
  LuRotateCcw,
  LuSlidersHorizontal,
  LuSparkles,
} from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatChessTime } from "@/lib/chess-clock";
import { type ChessSettings } from "@/lib/chess-game";
import { useChessAudio } from "@/hooks/useChessAudio";
import { useGame } from "./GameContext";
import SplashScreen from "./SplashScreen";
import { useThreeDPieces } from "./ThreeDPieces";
import s from "./chess.module.css";

export default function ChessHome() {
  const game = useGame();
  const [cursor, setCursor] = useState<Square>("e2");
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const viewedBoard = useMemo(() => new Chess(game.position), [game.position]);
  const cursorPiece = viewedBoard.get(cursor);
  const pieceNames = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  const cursorLabel = `${cursor}: ${cursorPiece ? `${cursorPiece.color === "w" ? "white" : "black"} ${pieceNames[cursorPiece.type]}` : "empty"}`;
  const pieces = useThreeDPieces();
  const reduced = useReducedMotion();
  const [panel, setPanel] = useState<
    "options" | "restart" | "resign" | "menu" | null
  >(null);
  const focusReturn = useRef<HTMLElement | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const openPanel = (value: "options" | "restart" | "resign" | "menu") => {
    focusReturn.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPanel(value);
  };
  const unlockAudio = useChessAudio(
    game.settings.music,
    game.settings.sounds,
    game.screen === "playing" && !game.gameOver,
    game.moveHistory.length,
  );
  const live = game.screen === "playing";
  const active = !game.gameOver;
  const resultContent = !!game.gameOver && (game.resultOpen || panel === null);
  const status = game.gameOver
    ? "Match complete"
    : game.isReplaying
      ? game.timeControl
        ? "Reviewing · clocks keep running"
        : "Reviewing · return to the latest move to play"
      : game.engineError
        ? "Opponent unavailable. Start a new match to retry."
        : game.thinking
          ? "Mogul is thinking…"
          : game.timeControl && game.clock.white <= 20000
            ? "Low time · under 20 seconds to make your moves"
            : game.inCheck
              ? "You’re in check · protect your king"
              : "Your move · tap a piece or drag to move";
  const player = (white: boolean) => {
    const time = white ? game.clock.white : game.clock.black;
    const current = active && (white ? !game.thinking : game.thinking);
    const captured = white ? game.capturedBlack : game.capturedWhite;
    return (
      <div className={s.player}>
        <div className={s.avatar} aria-hidden="true">
          {white ? "♙" : "♟"}
        </div>
        <div className={s.playerName}>
          <strong>{white ? "You" : "Mogul"}</strong>
          <small>
            {white
              ? "White pieces"
              : `${game.difficulty === "easy" ? "Casual" : game.difficulty === "medium" ? "Club" : "Expert"} opponent`}
            {current ? " · to move" : ""}
          </small>
          {captured.length > 0 && (
            <small aria-label={`${captured.length} pieces captured`}>
              {captured
                .map(
                  (piece) =>
                    ({ p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" })[piece],
                )
                .join(" ")}
            </small>
          )}
        </div>
        <div
          className={s.clock}
          data-active={current}
          data-low={!!game.timeControl && time <= 20000}
          aria-label={`${white ? "Your" : "Opponent’s"} time ${game.timeControl ? formatChessTime(time) : "untimed"}`}
        >
          {game.timeControl ? formatChessTime(time) : "∞"}
        </div>
      </div>
    );
  };
  const toggles: { key: keyof ChessSettings; title: string; detail: string }[] =
    [
      {
        key: "music",
        title: "Focus music",
        detail: "A quiet, original ambient soundtrack",
      },
      {
        key: "sounds",
        title: "Move sounds",
        detail: "A subtle note with every move",
      },
      {
        key: "hints",
        title: "Direction hints",
        detail: "Show legal destinations for your piece",
      },
      {
        key: "dimensional",
        title: "Sculpted pieces",
        detail: "Dimensional pieces on a wooden board",
      },
    ];
  const header = (
    <header className={`${s.header} ${live ? s.gameHeader : ""}`}>
      {live ? (
        <button
          className={s.backButton}
          onClick={() => openPanel("menu")}
          aria-label="Back to game setup"
        >
          <LuArrowLeft size={22} />
        </button>
      ) : (
        <div>
          <div className={s.eyebrow}>The pocket chess club</div>
          <div className={s.brand}>
            Chess Mogul<span style={{ color: "var(--chess-gold)" }}> .</span>
          </div>
        </div>
      )}
      <button
        className={s.iconButton}
        aria-label="Game options"
        onClick={() => openPanel("options")}
      >
        <LuSlidersHorizontal size={18} />
      </button>
    </header>
  );
  return (
    <div className={s.app} data-screen={game.screen}>
      {!live && header}
      {!live ? (
        <SplashScreen onStart={unlockAudio} />
      ) : (
        <>
          <div
            className={s.gameContent}
            role="region"
            aria-label={`Chess match. ${status}`}
          >
            {header}
            {player(false)}
            <div
              className={s.board}
              ref={boardRef}
              tabIndex={0}
              role="group"
              aria-label={`Chessboard. ${cursorLabel}. Arrow keys to explore, Enter to select or move, Escape to cancel.`}
              onPointerDown={unlockAudio}
              onFocus={() => setKeyboardFocus(true)}
              onBlur={() => setKeyboardFocus(false)}
              onKeyDown={(event) => {
                unlockAudio();
                const offsets: Record<string, [number, number]> = {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, 1],
                  ArrowDown: [0, -1],
                };
                const offset = offsets[event.key];
                if (offset) {
                  event.preventDefault();
                  const file = Math.max(
                    0,
                    Math.min(7, cursor.charCodeAt(0) - 97 + offset[0]),
                  );
                  const rank = Math.max(
                    1,
                    Math.min(8, Number(cursor[1]) + offset[1]),
                  );
                  setCursor(
                    `${String.fromCharCode(97 + file)}${rank}` as Square,
                  );
                } else if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  game.onSquareClick({ square: cursor, piece: null });
                } else if (event.key === "Escape") game.clearSelection();
              }}
            >
              <Chessboard
                options={{
                  id: "mogul-board",
                  position: game.position,
                  onSquareClick: game.onSquareClick,
                  onPieceDrop: game.onPieceDrop,
                  allowDragging: active && !game.thinking && !game.isReplaying,
                  allowDragOffBoard: false,
                  animationDurationInMs: reduced ? 0 : 170,
                  squareStyles: {
                    ...game.optionSquares,
                    ...(keyboardFocus
                      ? {
                          [cursor]: {
                            ...game.optionSquares[cursor],
                            boxShadow: "inset 0 0 0 3px #ffe4a0",
                          },
                        }
                      : {}),
                  },
                  pieces: game.settings.dimensional ? pieces : undefined,
                  boardStyle: { borderRadius: 3 },
                  lightSquareStyle: { backgroundColor: "#e3ccab" },
                  darkSquareStyle: { backgroundColor: "#8d6a4c" },
                }}
              />
            </div>
            {player(true)}
            {/*<div className={s.status} role="status">*/}
            {/*  {keyboardFocus ? (*/}
            {/*    cursorLabel*/}
            {/*  ) : game.gameOver ? (*/}
            {/*    <button onClick={game.showResult}>*/}
            {/*      Match complete · View result*/}
            {/*    </button>*/}
            {/*  ) : (*/}
            {/*    status*/}
            {/*  )}*/}
            {/*</div>*/}
            <div className={s.moves} aria-label="Recent moves">
              {game.moveHistory.length ? (
                game.moveHistory.slice(-6).map((move, index) => {
                  const ply =
                    game.moveHistory.length -
                    Math.min(game.moveHistory.length, 6) +
                    index;
                  return (
                    <div key={ply}>
                      <span>
                        {Math.floor(ply / 2) + 1}
                        {ply % 2 ? "…" : "."}{" "}
                      </span>
                      {move.san}
                    </div>
                  );
                })
              ) : (
                <span>The opening is yours.</span>
              )}
            </div>
          </div>
          <div className={s.controls} role="group" aria-label="Game controls">
            <button
              onClick={() => openPanel("resign")}
              disabled={!!game.gameOver}
            >
              <LuFlag />
              Resign
            </button>
            <button onClick={() => openPanel("restart")}>
              <LuRotateCcw />
              New game
            </button>
            <button
              onClick={() => game.handleReplayMove("back")}
              disabled={!game.replayIndex}
            >
              <LuChevronLeft />
              Previous
            </button>
            <button
              onClick={() => game.handleReplayMove("forward")}
              disabled={!game.isReplaying}
            >
              <LuChevronRight />
              Next
            </button>
          </div>
        </>
      )}
      <Dialog
        open={game.resultOpen || panel !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (game.resultOpen) game.dismissResult();
            setPanel(null);
          }
        }}
      >
        <DialogContent
          className={`${s.app} ${s.panel} ${s.optionsDialog} ${resultContent ? s.resultDialog : ""}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (game.gameOver) boardRef.current?.focus();
            else focusReturn.current?.focus();
          }}
        >
          {resultContent && game.gameOver ? (
            <>
              <LuSparkles className={s.resultIcon} aria-hidden="true" />
              <DialogTitle className={`${s.dialogTitle} ${s.resultTitle}`}>
                {game.gameOver.winner === "Draw"
                  ? "A worthy draw."
                  : game.gameOver.winner === "White"
                    ? "Beautifully played."
                    : "Every game teaches."}
              </DialogTitle>
              <DialogDescription className={s.dialogDescription}>
                {game.gameOver.winner === "Draw"
                  ? "Draw"
                  : `${game.gameOver.winner} wins`}{" "}
                by {game.gameOver.result}.
              </DialogDescription>
              <button
                className={s.primary}
                onClick={() => {
                  unlockAudio();
                  game.restartGame();
                  setPanel(null);
                }}
              >
                Play again
              </button>
              <button
                className={s.secondary}
                onClick={() => {
                  game.dismissResult();
                  setPanel(null);
                }}
              >
                Review game
              </button>
              <button
                className={s.resultSetup}
                onClick={() => {
                  game.navigateToMenu();
                  setPanel(null);
                }}
              >
                Choose a new challenge
              </button>
            </>
          ) : (
            <>
              <div>
                <DialogTitle className={s.dialogTitle}>
                  {panel === "options"
                    ? "Your kind of game."
                    : panel === "resign"
                      ? "Resign this match?"
                      : panel === "restart"
                        ? "A fresh board?"
                        : "Back to the club?"}
                </DialogTitle>
                <DialogDescription className={s.dialogDescription}>
                  {panel === "options"
                    ? "Small details. A better way to play."
                    : "This ends your current match"}
                </DialogDescription>
              </div>
              {panel === "options" ? (
                <>
                  <div>
                    {toggles.map(({ key, title, detail }) => (
                      <div className={s.toggleRow} key={key}>
                        <span>
                          <strong id={`chess-${key}`}>{title}</strong>
                          <small id={`chess-${key}-detail`}>{detail}</small>
                        </span>
                        <button
                          role="switch"
                          aria-checked={game.settings[key]}
                          aria-labelledby={`chess-${key}`}
                          aria-describedby={`chess-${key}-detail`}
                          className={s.switch}
                          onClick={() => {
                            unlockAudio();
                            game.setSettings((current) => ({
                              ...current,
                              [key]: !current[key],
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button
                    className={s.primary}
                    onClick={() => {
                      if (panel === "resign") game.forfeitGame();
                      else if (panel === "restart") {
                        unlockAudio();
                        game.restartGame();
                      } else game.navigateToMenu();
                      setPanel(null);
                    }}
                  >
                    {panel === "resign"
                      ? "Resign match"
                      : panel === "restart"
                        ? "Start again"
                        : "Return to setup"}
                  </button>
                  <button
                    className={s.secondary}
                    onClick={() => setPanel(null)}
                  >
                    Keep playing
                  </button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
