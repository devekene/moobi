import Engine from "@/stockfish/engine";
import { Chess, Move, Square } from "chess.js";
import { useEffect, useRef, useState } from "react";
import { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";

type GameStatus = {
  gameOver: boolean;
  result?: string;
  winner?: string;
} | null;

type Screen = "menu" | "playing";

const initialFen = new Chess().fen();

export function useChessGame() {
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !engineRef.current) {
      engineRef.current = new Engine();
    }

    return () => {
      engineRef.current?.terminate();
    };
  }, []);

  const chessRef = useRef(new Chess());
  const chess = chessRef.current;

  const [position, setPosition] = useState(initialFen);
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState({});

  const [screen, setScreen] = useState<Screen>("menu");

  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "hard",
  );
  const [gameOver, setGameOver] = useState<GameStatus>(null);
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);

  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [fenHistory, setFenHistory] = useState<string[]>([initialFen]);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState(false);

  const findBestMove = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const depth =
      difficulty === "easy" ? 10 : difficulty === "medium" ? 15 : 20;

    const fen = chess.fen();
    engine.evaluatePosition(fen, depth);

    engine.onMessage(({ pv, depth }) => {
      if (!pv || !depth || depth < 10) {
        return;
      }

      const from = pv.slice(0, 2) as Square;
      const to = pv.slice(2, 4) as Square;

      const legalMoves = chess.moves({ verbose: true });
      const isLegal = legalMoves.some((m) => m.from === from && m.to === to);

      if (!isLegal) {
        return false;
      } else {
        attemptMove(from, to, false);
      }
    });
  };

  const checkGameStatus = () => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === "w" ? "Black" : "White";
      return { gameOver: true, result: "checkmate", winner };
    }
    if (chess.isStalemate())
      return { gameOver: true, result: "stalemate", winner: "Draw" };
    if (chess.isInsufficientMaterial())
      return {
        gameOver: true,
        result: "insufficient material",
        winner: "Draw",
      };
    if (chess.isThreefoldRepetition())
      return { gameOver: true, result: "threefold repetition", winner: "Draw" };
    if (chess.isDraw())
      return { gameOver: true, result: "draw", winner: "Draw" };
    return { gameOver: false };
  };

  const highlightMoves = (square: Square) => {
    const moves = chess.moves({ square, verbose: true });
    if (!moves.length) return (setOptionSquares({}), false);

    const highlights: Record<string, React.CSSProperties> = {};
    moves.forEach((move) => {
      highlights[move.to] = {
        background: chess.get(move.to)
          ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    highlights[square] = { background: "rgba(255,255,0,0.4)" };
    setOptionSquares(highlights);
    return true;
  };

  const attemptMove = (from: Square, to: Square, isPlayer = true) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isReplaying) return false;

    const move = chess.move({ from, to, promotion: "q" });
    if (!move) return false;

    const newHistory = chess.history({ verbose: true });
    setMoveHistory(newHistory);

    setFenHistory((prev) => {
      const next = [...prev, chess.fen()];
      setReplayIndex(next.length - 1);
      return next;
    });

    if (move.captured) {
      if (move.color === "w") {
        setCapturedBlack((prev) => [...prev, move.captured!]);
      } else {
        setCapturedWhite((prev) => [...prev, move.captured!]);
      }
    }

    const status = checkGameStatus();
    if (status.gameOver) {
      setGameOver(status);
    } else if (isPlayer) {
      setTimeout(findBestMove, 300);
    }

    engine.stop();
    setPosition(chess.fen());
    setMoveFrom("");
    setOptionSquares({});
    return true;
  };

  const onSquareClick = ({ square, piece }: SquareHandlerArgs) => {
    if (isReplaying) return;
    if (!moveFrom && piece) {
      if (highlightMoves(square as Square)) setMoveFrom(square);
      return;
    }

    const moves = chess.moves({ square: moveFrom as Square, verbose: true });
    const validMove = moves.find((m) => m.to === square);
    if (!validMove)
      return setMoveFrom(highlightMoves(square as Square) ? square : "");

    attemptMove(moveFrom as Square, square as Square);
  };

  const onPieceDrop = ({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs) => {
    if (!targetSquare || isReplaying) return false;

    if (sourceSquare === targetSquare) return false;

    const currentTurn = chess.turn();

    if (currentTurn === "b") return false;

    const result = attemptMove(sourceSquare as Square, targetSquare as Square);

    if (!result) {
      return false;
    } else {
      return result;
    }
  };

  const startGame = (level: "easy" | "medium" | "hard") => {
    setDifficulty(level);
    setScreen("playing");
  };

  const restartGame = () => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.stop();
    chess.reset();

    setPosition(chess.fen());
    setFenHistory([chess.fen()]);

    setOptionSquares({});
    setGameOver(null);
    setMoveHistory([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setMoveFrom("");
  };

  const forfeitGame = () => {
    if (gameOver) return;

    setGameOver({ gameOver: true, result: "forfeit", winner: "Black" });
  };

  const handleReplayMove = (direction: "forward" | "back") => {
    const atStart = replayIndex === 0;
    const atEnd = replayIndex === fenHistory.length - 1;

    if (!isReplaying) setIsReplaying(true);

    if (direction === "forward") {
      if (!atEnd) {
        const next = replayIndex + 1;
        setReplayIndex(next);
        setPosition(fenHistory[next]);
        setIsReplaying(true);
        // if we just reached the end and game isn't over, exit replay so play can continue
        if (next === fenHistory.length - 1 && !gameOver) setIsReplaying(false);
      } else {
        setIsReplaying(false);
      }
      return;
    }

    if (direction === "back") {
      if (!atStart) {
        const prev = replayIndex - 1;
        setReplayIndex(prev);
        setPosition(fenHistory[prev]);
        setIsReplaying(true);
      }
    }
  };

  const navigateToMenu = () => {
    restartGame();
    setScreen("menu");
  };

  return {
    position,
    optionSquares,
    capturedWhite,
    capturedBlack,
    gameOver,
    moveHistory,
    isReplaying,
    replayIndex,
    restartGame,
    forfeitGame,
    onPieceDrop,
    onSquareClick,
    handleReplayMove,
    screen,
    startGame,
    navigateToMenu,
  };
}
