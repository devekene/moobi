import { Chess, type Square } from "chess.js";
import {
  createChessClock,
  readChessClock,
  type TimeControl,
} from "./chess-clock";

export type ChessSettings = {
  music: boolean;
  sounds: boolean;
  hints: boolean;
  dimensional: boolean;
};
export type Difficulty = "easy" | "medium" | "hard";
export type ChessResult = {
  gameOver: true;
  result: string;
  winner: "White" | "Black" | "Draw";
};

export class ChessGame {
  chess = new Chess();
  screen: "menu" | "playing" = "menu";
  difficulty: Difficulty = "medium";
  timeControl: TimeControl = 3;
  clock = createChessClock(0, 0);
  result: ChessResult | null = null;
  private resultDismissed = false;
  history = [this.chess.fen()];
  replayIndex = 0;
  revision = 0;
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.revision;
  notify = () => {
    this.revision++;
    this.listeners.forEach((listener) => listener());
  };
  get isReplaying() {
    return this.replayIndex !== this.history.length - 1;
  }
  get resultOpen() {
    return (
      this.screen === "playing" && this.result !== null && !this.resultDismissed
    );
  }
  dismissResult() {
    if (!this.result) return;
    this.resultDismissed = true;
    this.notify();
  }
  showResult() {
    if (!this.result) return;
    this.resultDismissed = false;
    this.notify();
  }
  start(level: Difficulty, minutes: TimeControl, now: number) {
    this.chess.reset();
    this.difficulty = level;
    this.timeControl = minutes;
    this.clock = createChessClock(minutes, now);
    this.result = null;
    this.resultDismissed = false;
    this.history = [this.chess.fen()];
    this.replayIndex = 0;
    this.screen = "playing";
    this.notify();
  }
  tick(now: number) {
    if (this.screen !== "playing" || this.result || this.clock.since === null)
      return;
    const previous = this.clock;
    this.clock = readChessClock(this.clock, now);
    const remaining =
      this.clock.turn === "w" ? this.clock.white : this.clock.black;
    if (remaining === 0) {
      // A lone king cannot win on time, even if the other side flags.
      const winnerColor = this.clock.turn === "w" ? "b" : "w";
      const material = this.chess
        .board()
        .flat()
        .filter((piece) => piece?.color === winnerColor);
      const draw =
        this.chess.isInsufficientMaterial() ||
        material.every((piece) => piece?.type === "k");
      this.result = {
        gameOver: true,
        result: draw ? "timeout · insufficient material" : "timeout",
        winner: draw ? "Draw" : winnerColor === "w" ? "White" : "Black",
      };
      this.clock.since = null;
    }
    if (
      this.result ||
      Math.ceil(previous.white / 1000) !== Math.ceil(this.clock.white / 1000) ||
      Math.ceil(previous.black / 1000) !== Math.ceil(this.clock.black / 1000)
    )
      this.notify();
  }
  move(
    from: Square,
    to: Square,
    player: boolean,
    now: number,
    promotion = "q",
  ) {
    this.tick(now);
    if (
      this.screen !== "playing" ||
      this.result ||
      (player && this.isReplaying) ||
      this.chess.turn() !== (player ? "w" : "b")
    )
      return false;
    let move;
    try {
      move = this.chess.move({ from, to, promotion });
    } catch {
      return false;
    }
    if (!move) return false;
    const followingLive = !this.isReplaying;
    this.history.push(this.chess.fen());
    if (followingLive) this.replayIndex = this.history.length - 1;
    const movedSide = move.color === "w" ? "white" : "black";
    this.clock[movedSide] += this.clock.incrementMs ?? 0;
    this.clock.turn = this.chess.turn();
    if (this.chess.isGameOver()) {
      const result = this.chess.isCheckmate()
        ? "checkmate"
        : this.chess.isStalemate()
          ? "stalemate"
          : this.chess.isInsufficientMaterial()
            ? "insufficient material"
            : this.chess.isThreefoldRepetition()
              ? "threefold repetition"
              : "draw";
      this.result = {
        gameOver: true,
        result,
        winner:
          result === "checkmate"
            ? this.chess.turn() === "w"
              ? "Black"
              : "White"
            : "Draw",
      };
      this.clock.since = null;
    }
    this.notify();
    return true;
  }
  resign(now: number) {
    this.tick(now);
    if (this.result) return;
    this.result = { gameOver: true, result: "resignation", winner: "Black" };
    this.clock.since = null;
    this.notify();
  }
  replay(direction: "back" | "forward") {
    this.replayIndex = Math.max(
      0,
      Math.min(
        this.history.length - 1,
        this.replayIndex + (direction === "back" ? -1 : 1),
      ),
    );
    this.notify();
  }
  menu() {
    this.screen = "menu";
    this.clock.since = null;
    this.notify();
  }
}
