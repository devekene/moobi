import Engine from "@/stockfish/engine";
import {
  ChessGame,
  type ChessSettings,
  type Difficulty,
} from "@/lib/chess-game";
import { type TimeControl } from "@/lib/chess-clock";
import { type Square } from "chess.js";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";

export function useChessGame() {
  const [game] = useState(() => new ChessGame());
  useSyncExternalStore(game.subscribe, game.snapshot, game.snapshot);
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [settings, setSettings] = useState<ChessSettings>({
    music: false,
    sounds: true,
    hints: true,
    dimensional: true,
  });
  const [engineError, setEngineError] = useState(false);
  const fen = game.chess.fen();
  const thinking =
    game.screen === "playing" && !game.result && game.chess.turn() === "b";

  useEffect(() => {
    if (game.screen !== "playing" || game.result || !game.timeControl) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const update = () => game.tick(performance.now());
    // Hidden tabs stop polling; reconcile elapsed match time on visibility changes.
    const syncVisibility = () => {
      clearInterval(interval);
      update();
      if (!document.hidden) interval = setInterval(update, 100);
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [game, game.screen, game.result, game.timeControl]);

  useEffect(() => {
    if (!thinking) return;
    const engine = new Engine();
    let active = true;
    let started = false;
    const start = () => {
      if (started || !active) return;
      started = true;
      engine.evaluatePosition(
        fen,
        game.difficulty === "easy" ? 3 : game.difficulty === "medium" ? 9 : 18,
        game.difficulty === "hard" ? 1800 : 700,
      );
    };
    const unsubscribe = engine.onMessage(({ bestMove, uciMessage }) => {
      if (uciMessage === "readyok") start();
      if (!active || !bestMove || game.chess.fen() !== fen || game.result)
        return;
      if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestMove)) {
        game.move(
          bestMove.slice(0, 2) as Square,
          bestMove.slice(2, 4) as Square,
          false,
          performance.now(),
          bestMove[4] ?? "q",
        );
      }
    });
    const failed = () => {
      if (active) setEngineError(true);
    };
    engine.stockfish?.addEventListener("error", failed);
    const watchdog = window.setTimeout(failed, 15000);
    return () => {
      active = false;
      clearTimeout(watchdog);
      unsubscribe();
      engine.terminate();
    };
  }, [thinking, fen, game]);

  const resetSelection = () => setMoveFrom(null);
  const attemptMove = (from: Square, to: Square) => {
    const moved = game.move(from, to, true, performance.now());
    if (moved) resetSelection();
    return moved;
  };
  const onSquareClick = ({ square }: SquareHandlerArgs) => {
    if (game.result || game.isReplaying || game.chess.turn() !== "w") return;
    if (moveFrom && attemptMove(moveFrom, square as Square)) return;
    setMoveFrom(
      game.chess.get(square as Square)?.color === "w"
        ? (square as Square)
        : null,
    );
  };
  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) =>
    !!targetSquare &&
    attemptMove(sourceSquare as Square, targetSquare as Square);
  const optionSquares: Record<string, CSSProperties> = {};
  if (moveFrom && !game.isReplaying) {
    optionSquares[moveFrom] = { backgroundColor: "rgba(221, 187, 105, .65)" };
    if (settings.hints)
      game.chess.moves({ square: moveFrom, verbose: true }).forEach((move) => {
        optionSquares[move.to] = {
          background: move.captured
            ? "radial-gradient(transparent 58%, rgba(28,65,49,.55) 60%)"
            : "radial-gradient(rgba(28,65,49,.4) 21%, transparent 23%)",
        };
      });
  }
  const startGame = (
    level: Difficulty,
    minutes: TimeControl = game.timeControl,
  ) => {
    resetSelection();
    setEngineError(false);
    game.start(level, minutes, performance.now());
  };
  const moves = game.chess.history({ verbose: true });
  return {
    position: game.history[game.replayIndex],
    optionSquares,
    screen: game.screen,
    gameOver: game.result,
    resultOpen: game.resultOpen,
    dismissResult: () => game.dismissResult(),
    showResult: () => game.showResult(),
    moveHistory: moves,
    isReplaying: game.isReplaying,
    replayIndex: game.replayIndex,
    difficulty: game.difficulty,
    timeControl: game.timeControl,
    clock: game.clock,
    thinking,
    inCheck: game.chess.isCheck(),
    settings,
    setSettings,
    engineError,
    capturedWhite: moves
      .filter((m) => m.color === "b" && m.captured)
      .map((m) => m.captured!),
    capturedBlack: moves
      .filter((m) => m.color === "w" && m.captured)
      .map((m) => m.captured!),
    startGame,
    restartGame: () => startGame(game.difficulty),
    navigateToMenu: () => {
      resetSelection();
      game.menu();
    },
    forfeitGame: () => game.resign(performance.now()),
    clearSelection: resetSelection,
    onSquareClick,
    onPieceDrop,
    handleReplayMove: (direction: "forward" | "back") => {
      resetSelection();
      game.replay(direction);
    },
  };
}
