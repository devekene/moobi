import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  availableDice,
  chooseBotMove,
  createLudoGame,
  forcedSeedMove,
  HOME_PROGRESS,
  moveLudoSeed,
  movableSeeds,
  rollLudo,
  seedMovementFrames,
  type DicePair,
  type LudoGame as LudoGameState,
} from "@/lib/ludo";
import { createLudoStore } from "@/stores/useLudoStore";
import LudoGameScreen from "@/components/screens/ludo/LudoGame";
import {
  BASE_CAPTAINS,
  baseCaptain,
  ludoBoardCellColor,
} from "@/components/screens/ludo/ludo-board";

const memory = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
    removeItem: (key: string) => data.delete(key),
  };
};

const moving = (game: LudoGameState, dice: DicePair): LudoGameState => ({
  ...game,
  dice,
  remainingDice: [true, true],
  phase: "move",
});

describe("two-dice Ludo rules", () => {
  it("requires a six to release a seed, then spends the second die", () => {
    const game = createLudoGame("duel", "🦊", "balanced");
    const missed = rollLudo(game, [4, 5]);
    expect(missed.currentPlayer).toBe(1);
    expect(missed.phase).toBe("roll");

    const rolled = rollLudo(game, [6, 3]);
    expect(availableDice(rolled)).toEqual([0]);
    expect(movableSeeds(rolled, 0)).toEqual([0, 1, 2, 3]);
    const released = moveLudoSeed(rolled, 2, 0);
    expect(released.seeds.you).toEqual([-1, -1, 0, -1]);
    expect(availableDice(released)).toEqual([1]);
    const moved = moveLudoSeed(released, 2, 1);
    expect(moved.seeds.you[2]).toBe(3);
    expect(moved.currentPlayer).toBe(1);
  });

  it("rolls again only after spending double six", () => {
    const game = createLudoGame("duel", "🦊", "balanced");
    const rolled = rollLudo(game, [6, 6]);
    const first = moveLudoSeed(rolled, 0, 0);
    const second = moveLudoSeed(first, 1, 1);
    expect(second.seeds.you.slice(0, 2)).toEqual([0, 0]);
    expect(second.currentPlayer).toBe(0);
    expect(second.phase).toBe("roll");
    expect(second.lastEvent).toContain("double six");

    const ordinaryDoubles = moving(
      {
        ...game,
        seeds: { you: [0, -1, -1, -1], sol: [-1, -1, -1, -1] },
      },
      [4, 4],
    );
    const fourth = moveLudoSeed(ordinaryDoubles, 0, 0);
    const eighth = moveLudoSeed(fourth, 0, 1);
    expect(eighth.seeds.you[0]).toBe(8);
    expect(eighth.currentPlayer).toBe(1);
    expect(eighth.phase).toBe("roll");
    expect(eighth.lastEvent).not.toContain("roll again");
  });

  it("captures on an open track square but protects safe stars", () => {
    const base = createLudoGame("duel", "🦊", "bold");
    const capture = moving(
      { ...base, seeds: { you: [4, -1, -1, -1], sol: [31, -1, -1, -1] } },
      [1, 2],
    );
    const captured = moveLudoSeed(capture, 0, 0);
    expect(captured.seeds.sol[0]).toBe(-1);
    expect(captured.lastEvent).toContain("sent 1 seed home");

    const safe = moving(
      { ...base, seeds: { you: [7, -1, -1, -1], sol: [34, -1, -1, -1] } },
      [1, 2],
    );
    expect(moveLudoSeed(safe, 0, 0).seeds.sol[0]).toBe(34);
  });

  it("captures on starts and stars when the board has no protection", () => {
    const base = createLudoGame("duel", "🦊", "bold", "open");
    const starCapture = moving(
      {
        ...base,
        seeds: { you: [7, -1, -1, -1], sol: [34, -1, -1, -1] },
      },
      [1, 2],
    );
    expect(moveLudoSeed(starCapture, 0, 0).seeds.sol[0]).toBe(-1);

    const startCapture = moving(
      {
        ...base,
        seeds: { you: [38, -1, -1, -1], sol: [13, -1, -1, -1] },
      },
      [1, 2],
    );
    expect(moveLudoSeed(startCapture, 0, 0).seeds.sol[0]).toBe(-1);
  });

  it("requires an exact home die and wins with all four seeds home", () => {
    const game = createLudoGame("duel", "🦊", "tactical");
    const nearHome: LudoGameState = {
      ...game,
      seeds: {
        you: [HOME_PROGRESS, HOME_PROGRESS, HOME_PROGRESS, HOME_PROGRESS - 1],
        sol: [-1, -1, -1, -1],
      },
    };
    expect(movableSeeds(moving(nearHome, [2, 3]), 0)).toEqual([]);
    const won = moveLudoSeed(moving(nearHome, [1, 3]), 3, 0);
    expect(won.winnerId).toBe("you");
    expect(won.phase).toBe("complete");
  });

  it("scores the capturing seed in capture-and-leave matches", () => {
    const game = createLudoGame("duel", "🦊", "bold", "open", "leave");
    const capture = moving(
      {
        ...game,
        seeds: {
          you: [4, HOME_PROGRESS, HOME_PROGRESS, HOME_PROGRESS],
          sol: [31, -1, -1, -1],
        },
      },
      [1, 2],
    );
    const result = moveLudoSeed(capture, 0, 0);
    expect(result.seeds.you[0]).toBe(HOME_PROGRESS);
    expect(result.seeds.sol[0]).toBe(-1);
    expect(result.winnerId).toBe("you");
    expect(result.lastEvent).toContain("scores every seed");
  });

  it("keeps the capturing seed racing in capture-and-continue matches", () => {
    const game = createLudoGame("duel", "🦊", "bold", "open", "continue");
    const capture = moving(
      {
        ...game,
        seeds: { you: [4, -1, -1, -1], sol: [31, -1, -1, -1] },
      },
      [1, 2],
    );
    const result = moveLudoSeed(capture, 0, 0);
    expect(result.seeds.you[0]).toBe(5);
    expect(result.seeds.sol[0]).toBe(-1);
  });

  it("produces one visible frame for every square a seed travels", () => {
    expect(seedMovementFrames(8, 4)).toEqual([9, 10, 11, 12]);
    expect(seedMovementFrames(-1, 6)).toEqual([0]);
    expect(seedMovementFrames(-1, 3)).toEqual([]);
    expect(seedMovementFrames(HOME_PROGRESS - 1, 2)).toEqual([]);
  });

  it("enters the home lane directly from the middle approach tile", () => {
    const game = createLudoGame("duel", "🦊", "balanced");
    const entering = moving(
      {
        ...game,
        seeds: { you: [50, -1, -1, -1], sol: [-1, -1, -1, -1] },
      },
      [1, 3],
    );
    const moved = moveLudoSeed(entering, 0, 0);
    expect(moved.seeds.you[0]).toBe(51);
    expect(seedMovementFrames(50, 1)).toEqual([51]);
  });

  it("combines both dice when exactly one seed can legally spend the full roll", () => {
    const base = createLudoGame("duel", "🦊", "balanced");
    const onlySeed = moving(
      {
        ...base,
        seeds: {
          you: [12, HOME_PROGRESS, HOME_PROGRESS, HOME_PROGRESS],
          sol: [-1, -1, -1, -1],
        },
      },
      [2, 4],
    );
    const move = forcedSeedMove(onlySeed);
    expect(move).toEqual({
      seedIndex: 0,
      dieIndexes: [0, 1],
    });
    if (!move) throw new Error("Expected a forced seed move");
    const moved = move.dieIndexes.reduce(
      (game, dieIndex) => moveLudoSeed(game, move.seedIndex, dieIndex),
      onlySeed,
    );
    expect(moved.seeds.you[0]).toBe(18);
    expect(moved.currentPlayer).toBe(1);
  });

  it("uses the legal dice order when the sole seed must leave home first", () => {
    const base = createLudoGame("duel", "🦊", "balanced");
    const onlySeed = moving(
      {
        ...base,
        seeds: {
          you: [-1, HOME_PROGRESS, HOME_PROGRESS, HOME_PROGRESS],
          sol: [-1, -1, -1, -1],
        },
      },
      [3, 6],
    );
    expect(forcedSeedMove(onlySeed)).toEqual({
      seedIndex: 0,
      dieIndexes: [1, 0],
    });
  });

  it("keeps the dice choice when a combined move would overshoot home", () => {
    const base = createLudoGame("duel", "🦊", "balanced");
    const nearHome = moving(
      {
        ...base,
        seeds: {
          you: [54, HOME_PROGRESS, HOME_PROGRESS, HOME_PROGRESS],
          sol: [-1, -1, -1, -1],
        },
      },
      [2, 3],
    );
    expect(forcedSeedMove(nearHome)).toBeNull();
  });

  it("keeps the seed choice when more than one seed can move", () => {
    const base = createLudoGame("duel", "🦊", "balanced");
    const choice = moving(
      {
        ...base,
        seeds: {
          you: [8, 14, HOME_PROGRESS, HOME_PROGRESS],
          sol: [-1, -1, -1, -1],
        },
      },
      [2, 4],
    );
    expect(forcedSeedMove(choice)).toBeNull();
  });

  it("lets bot personalities choose a die and seed together", () => {
    const game = moving(createLudoGame("solo", "🦊", "bold"), [1, 2]);
    const bold: LudoGameState = {
      ...game,
      currentPlayer: 1,
      seeds: {
        you: [6, -1, -1, -1],
        maji: [18, 20, -1, -1],
        sol: [-1, -1, -1, -1],
        zuri: [-1, -1, -1, -1],
      },
    };
    expect(chooseBotMove(bold)).toEqual({ dieIndex: 0, seedIndex: 0 });
    const tactical = {
      ...bold,
      remainingDice: [true, false] as const,
      players: bold.players.map((player) =>
        player.id === "maji" ? { ...player, strategy: "tactical" as const } : player,
      ),
    };
    expect(chooseBotMove(tactical)).toEqual({ dieIndex: 0, seedIndex: 1 });
  });

  it("brings out a second bot seed instead of overcommitting one runner", () => {
    const base = createLudoGame("duel", "🦊", "balanced");
    const game: LudoGameState = {
      ...moving(base, [6, 2]),
      currentPlayer: 1,
      seeds: {
        you: [-1, -1, -1, -1],
        sol: [24, -1, -1, -1],
      },
    };
    expect(chooseBotMove(game)).toEqual({ dieIndex: 0, seedIndex: 1 });
  });

  it("sets up a capture threat instead of blindly advancing the lead seed", () => {
    const base = createLudoGame("duel", "🦊", "tactical", "open");
    const game: LudoGameState = {
      ...moving(base, [2, 5]),
      currentPlayer: 1,
      remainingDice: [true, false],
      seeds: {
        you: [50, -1, -1, -1],
        sol: [18, 30, -1, -1],
      },
    };
    expect(chooseBotMove(game)).toEqual({ dieIndex: 0, seedIndex: 0 });
  });
});

describe("Ludo experience", () => {
  it("places duel players diagonally and keeps a captain in every base", () => {
    const game = createLudoGame("duel", "🦅", "balanced");
    expect(game.players.map((player) => player.color)).toEqual(["red", "yellow"]);
    expect(baseCaptain(game, "red")).toEqual({
      name: "You",
      avatar: "🦅",
    });
    expect(baseCaptain(game, "yellow")).toEqual({
      name: "Sol",
      avatar: "🦁",
    });
    expect(baseCaptain(game, "blue")).toBe(BASE_CAPTAINS.blue);
    expect(baseCaptain(game, "green")).toBe(BASE_CAPTAINS.green);
  });

  it("colors only each start tile and its five-tile finish lane", () => {
    expect(ludoBoardCellColor(6, 1)).toBe("blue");
    expect(ludoBoardCellColor(1, 8)).toBe("yellow");
    expect(ludoBoardCellColor(8, 13)).toBe("green");
    expect(ludoBoardCellColor(13, 6)).toBe("red");

    expect([1, 2, 3, 4, 5].map((col) => ludoBoardCellColor(7, col))).toEqual(
      Array(5).fill("blue"),
    );
    expect([1, 2, 3, 4, 5].map((row) => ludoBoardCellColor(row, 7))).toEqual(
      Array(5).fill("yellow"),
    );
    expect([13, 12, 11, 10, 9].map((col) => ludoBoardCellColor(7, col))).toEqual(
      Array(5).fill("green"),
    );
    expect([13, 12, 11, 10, 9].map((row) => ludoBoardCellColor(row, 7))).toEqual(
      Array(5).fill("red"),
    );

    expect(ludoBoardCellColor(6, 2)).toBe("path");
    expect(ludoBoardCellColor(6, 6)).toBe("center");
  });

  it("persists setup and records without restoring a live table", async () => {
    const storage = memory();
    const store = createLudoStore(storage);
    await store.persist.rehydrate();
    store.getState().chooseMode("party");
    store.getState().chooseProtection("open");
    store.getState().chooseCaptureStyle("leave");
    store.getState().chooseStrategy("bold");
    store.getState().chooseAvatar("🦅");
    store.getState().start();
    expect(store.getState().game?.players).toHaveLength(4);
    await Promise.resolve();
    const restored = createLudoStore(storage);
    await restored.persist.rehydrate();
    expect(restored.getState()).toMatchObject({
      mode: "party",
      protection: "open",
      captureStyle: "leave",
      strategy: "bold",
      avatar: "🦅",
      games: 1,
      game: null,
    });
  });

  it("renders the classic-board setup with two-dice rules", () => {
    const html = renderToStaticMarkup(createElement(LudoGameScreen));
    expect(html).toContain("Hunt the board.");
    expect(html).toContain("/images/ludo-capture-icon.webp");
    expect(html).toContain("CLASSIC BOARD · TWO DICE");
    expect(html).toContain('aria-label="Captain avatar"');
    expect(html).toContain('aria-label="Playstyle"');
    expect(html).toContain("Pass &amp; Play");
    expect(html).toContain("Protected Board");
    expect(html).toContain("Open Board");
    expect(html).toContain("Capture &amp; Continue");
    expect(html).toContain("Capture &amp; Leave");
    expect(html).toContain("Set the board");
  });
});
