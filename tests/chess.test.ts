import { describe, expect, it } from "vitest";
import { ChessGame } from "@/lib/chess-game";
import {
  createChessClock,
  readChessClock,
  formatChessTime,
  TIME_CONTROLS,
  TIME_PRESETS,
  getTimePreset,
} from "@/lib/chess-clock";

describe("Chess match clocks and rules", () => {
  it("offers the reference presets and retains untimed play", () => {
    expect(TIME_CONTROLS).toEqual(
      expect.arrayContaining([
        0,
        1,
        "1+1",
        "2+1",
        3,
        "3+2",
        5,
        10,
        "15+10",
        15,
        30,
      ]),
    );
    expect(new Set(TIME_CONTROLS).size).toBe(TIME_CONTROLS.length);
    const game = new ChessGame();
    game.start("medium", 0, 100);
    game.tick(9999999);
    expect(game.result).toBeNull();
    expect(game.clock.since).toBeNull();
    expect(game.move("e2", "e4", true, 9999999)).toBe(true);
  });
  it.each([3, 5, 10, 15] as const)("gives each player %i minutes", (time) => {
    expect(createChessClock(time, 100)).toEqual({
      white: time * 60000,
      black: time * 60000,
      since: 100,
      turn: "w",
    });
  });
  it.each(TIME_PRESETS)(
    "initializes $label from its base duration and increment",
    (preset) => {
      const clock = createChessClock(preset.value, 500);
      expect(clock.white).toBe(preset.minutes * 60000);
      expect(clock.black).toBe(preset.minutes * 60000);
      expect(clock.incrementMs ?? 0).toBe(preset.increment * 1000);
      expect(getTimePreset(preset.value)).toEqual(preset);
    },
  );
  it("adds increment only to the side that completes a legal move", () => {
    const game = new ChessGame();
    game.start("medium", "3+2", 0);
    expect(game.move("e2", "e5", true, 500)).toBe(false);
    expect(game.clock.white).toBe(179500);
    expect(game.move("e2", "e4", true, 1000)).toBe(true);
    expect(game.clock.white).toBe(181000);
    expect(game.clock.black).toBe(180000);
    expect(game.move("e7", "e5", false, 2500)).toBe(true);
    expect(game.clock.black).toBe(180500);
    expect(game.clock.white).toBe(181000);
  });
  it("cannot rescue a flagged player with increment and restarts the chosen preset", () => {
    const game = new ChessGame();
    game.start("hard", "1+1", 0);
    expect(game.move("e2", "e4", true, 60000)).toBe(false);
    expect(game.clock.white).toBe(0);
    expect(game.result?.result).toBe("timeout");
    game.start(game.difficulty, game.timeControl, 70000);
    expect(game.clock).toEqual(createChessClock("1+1", 70000));
    expect(game.result).toBeNull();
  });
  it("charges only the active side and keeps exact elapsed time between moves", () => {
    const game = new ChessGame();
    game.start("easy", 3, 0);
    expect(game.move("e2", "e4", true, 1250)).toBe(true);
    expect(game.clock.white).toBe(178750);
    expect(game.move("e7", "e5", false, 3000)).toBe(true);
    expect(game.clock.black).toBe(178250);
    game.tick(4000);
    expect(game.clock.white).toBe(177750);
  });
  it("rejects illegal moves and player moves during the engine turn", () => {
    const game = new ChessGame();
    game.start("medium", 5, 0);
    expect(game.move("e2", "e5", true, 10)).toBe(false);
    expect(game.move("e2", "e4", true, 20)).toBe(true);
    expect(game.move("e7", "e5", true, 30)).toBe(false);
    expect(game.history).toHaveLength(2);
  });
  it("settles timeout before accepting a move, including delayed background ticks", () => {
    const game = new ChessGame();
    game.start("hard", 3, 0);
    expect(game.move("e2", "e4", true, 180000)).toBe(false);
    expect(game.result).toMatchObject({ winner: "Black", result: "timeout" });
    expect(game.clock.white).toBe(0);
    expect(game.move("d2", "d4", true, 180100)).toBe(false);
    game.tick(9999999);
    expect(game.clock.black).toBe(180000);
  });
  it("lets the engine time out too", () => {
    const game = new ChessGame();
    game.start("hard", 3, 0);
    game.move("e2", "e4", true, 1000);
    game.tick(181000);
    expect(game.result).toMatchObject({ winner: "White", result: "timeout" });
  });
  it("keeps clocks and the live engine running during review without changing the viewed position", () => {
    const game = new ChessGame();
    game.start("medium", 3, 0);
    game.move("e2", "e4", true, 1000);
    game.replay("back");
    expect(game.isReplaying).toBe(true);
    expect(game.move("e7", "e5", false, 2000)).toBe(true);
    expect(game.replayIndex).toBe(0);
    game.tick(5000);
    expect(game.clock.white).toBe(176000);
    expect(game.move("d2", "d4", true, 5100)).toBe(false);
    game.replay("forward");
    game.replay("forward");
    expect(game.isReplaying).toBe(false);
    expect(game.move("d2", "d4", true, 5200)).toBe(true);
  });
  it("restarts a finished/reviewed match with a clean board and selected settings", () => {
    const game = new ChessGame();
    game.start("easy", 5, 0);
    game.move("e2", "e4", true, 1000);
    game.replay("back");
    game.resign(2000);
    game.start(game.difficulty, game.timeControl, 3000);
    expect(game.isReplaying).toBe(false);
    expect(game.replayIndex).toBe(0);
    expect(game.result).toBeNull();
    expect(game.history).toHaveLength(1);
    expect(game.clock).toEqual(createChessClock(5, 3000));
  });
  it("ends on checkmate, freezes both clocks, and blocks more moves", () => {
    const game = new ChessGame();
    game.start("easy", 3, 0);
    game.move("f2", "f3", true, 100);
    game.move("e7", "e5", false, 200);
    game.move("g2", "g4", true, 300);
    game.move("d8", "h4", false, 400);
    expect(game.result).toMatchObject({ result: "checkmate", winner: "Black" });
    expect(game.clock.since).toBeNull();
    expect(game.move("a2", "a3", true, 500)).toBe(false);
  });
  it("draws on timeout when the opponent has only a king", () => {
    const game = new ChessGame();
    game.start("medium", 3, 0);
    game.chess.load("7k/8/8/8/8/8/P7/K7 w - - 0 1");
    game.tick(180000);
    expect(game.result).toMatchObject({
      winner: "Draw",
      result: "timeout · insufficient material",
    });
  });
  it("publishes timer changes only when the displayed second changes", () => {
    const game = new ChessGame();
    game.start("medium", 3, 0);
    const initial = game.snapshot();
    game.tick(100);
    game.tick(200);
    game.tick(900);
    expect(game.snapshot()).toBe(initial);
    game.tick(1000);
    expect(game.snapshot()).toBe(initial + 1);
  });
  it("stops a match in the setup menu", () => {
    const game = new ChessGame();
    game.start("easy", 3, 0);
    game.menu();
    game.tick(9999999);
    expect(game.result).toBeNull();
    expect(game.move("e2", "e4", true, 10000000)).toBe(false);
  });
  it("clamps elapsed time and formats without showing 0:00 before flagfall", () => {
    expect(readChessClock(createChessClock(3, 100), 0).white).toBe(180000);
    expect(formatChessTime(1)).toBe("0:01");
    expect(formatChessTime(60001)).toBe("1:01");
    expect(formatChessTime(-1000)).toBe("0:00");
  });
});

describe("Chess result presentation", () => {
  it("opens the result when a match ends and dismisses it without changing the game", () => {
    const game = new ChessGame();
    game.start("medium", 3, 0);
    game.move("e2", "e4", true, 100);
    game.move("e7", "e5", false, 200);
    game.resign(300);
    expect(game.resultOpen).toBe(true);
    const result = game.result;
    const history = [...game.history];
    game.dismissResult();
    expect(game.resultOpen).toBe(false);
    expect(game.result).toBe(result);
    expect(game.history).toEqual(history);
    game.replay("back");
    expect(game.replayIndex).toBe(1);
    expect(game.resultOpen).toBe(false);
    expect(game.move("g1", "f3", true, 400)).toBe(false);
    game.replay("forward");
    expect(game.resultOpen).toBe(false);
    game.showResult();
    expect(game.resultOpen).toBe(true);
  });
  it("opens the next match result after a previous result was dismissed", () => {
    const game = new ChessGame();
    game.start("medium", 3, 0);
    game.resign(100);
    game.dismissResult();
    game.start("medium", 3, 200);
    expect(game.resultOpen).toBe(false);
    game.tick(180200);
    expect(game.result?.result).toBe("timeout");
    expect(game.resultOpen).toBe(true);
    game.menu();
    expect(game.resultOpen).toBe(false);
  });
  it("ignores result actions before a match has finished", () => {
    const game = new ChessGame();
    game.start("medium", 3, 0);
    game.showResult();
    game.dismissResult();
    expect(game.resultOpen).toBe(false);
    game.resign(100);
    expect(game.resultOpen).toBe(true);
  });
});
