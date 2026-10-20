import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  advance,
  COLUMNS,
  ROWS,
  newRound,
  placeFood,
  turn,
  type Round,
} from "@/lib/snake";
import { createSnakeStore } from "@/stores/useSnakeStore";
import SnakeGame from "@/components/screens/snake/SnakeGame";

const playing = (): Round => ({ ...newRound(), status: "playing" });
const memory = () => {
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
};

describe("Snake rules", () => {
  it("queues two rapid turns without permitting a reversal or skipping a turn", () => {
    const round = turn(turn(turn(playing(), "up"), "left"), "down");
    expect(round.queued).toEqual(["up", "left"]);
    const next = advance(round, "classic");
    expect(next.snake[0]).toEqual({ x: 6, y: 10 });
    expect(advance(next, "classic").snake[0]).toEqual({ x: 5, y: 10 });
    expect(turn(playing(), "left").queued).toEqual([]);
  });
  it("grows, scores, and places food away from the entire new snake", () => {
    const round = { ...playing(), food: { x: 7, y: 11 } };
    const next = advance(round, "classic", () => 0.5);
    expect(next.score).toBe(10);
    expect(next.snake).toHaveLength(5);
    expect(next.snake).not.toContainEqual(next.food);
  });
  it("ends at walls in Classic and wraps in Mellow", () => {
    const round = { ...playing(), snake: [{ x: 17, y: 4 }] };
    expect(advance(round, "classic").status).toBe("over");
    expect(advance(round, "mellow").snake[0]).toEqual({ x: 0, y: 4 });
  });
  it("allows moving into a vacating tail but ends on the body", () => {
    const round: Round = {
      ...playing(),
      snake: [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 2 },
      ],
    };
    expect(advance(round, "classic").status).toBe("playing");
    expect(
      advance({ ...round, snake: [...round.snake, { x: 4, y: 2 }] }, "classic")
        .status,
    ).toBe("over");
  });
  it("handles a full board and declares a win without looping", () => {
    const snake = Array.from({ length: COLUMNS * ROWS }, (_, i) => ({
      x: i % COLUMNS,
      y: Math.floor(i / COLUMNS),
    }));
    expect(placeFood(snake)).toBeNull();
    const round: Round = {
      ...playing(),
      snake: [
        { x: 1, y: 0 },
        ...snake.filter(
          (p) => !(p.x === 0 && p.y === 0) && !(p.x === 1 && p.y === 0),
        ),
      ],
      direction: "left",
      food: { x: 0, y: 0 },
    };
    expect(advance(round, "classic").status).toBe("won");
    expect(placeFood(snake.slice(1), () => 1)).toEqual({ x: 0, y: 0 });
  });
  it("does not move or turn while paused", () => {
    const round: Round = { ...playing(), status: "paused" };
    expect(advance(round, "rush")).toBe(round);
    expect(turn(round, "up")).toBe(round);
  });
});

describe("Snake records and session", () => {
  it("saves separate mode records and restores them without resuming a live game", async () => {
    const storage = memory();
    const store = createSnakeStore(storage);
    await store.persist.rehydrate();
    store.getState().start();
    for (let i = 0; i < 6; i++) store.getState().tick();
    expect(store.getState().records).toEqual({
      mellow: 0,
      classic: 10,
      rush: 0,
    });
    await Promise.resolve();
    const restored = createSnakeStore(storage);
    await restored.persist.rehydrate();
    expect(restored.getState().records.classic).toBe(10);
    expect(restored.getState().games).toBe(1);
    expect(restored.getState().round.status).toBe("ready");
  });
  it("keeps motion in memory and pauses/resumes the same round", async () => {
    const storage = memory();
    const store = createSnakeStore(storage);
    await store.persist.rehydrate();
    store.getState().start();
    await Promise.resolve();
    const writes = storage.setItem.mock.calls.length;
    store.getState().steer("up");
    store.getState().tick();
    store.getState().pause();
    const snake = store.getState().round.snake;
    store.getState().tick();
    expect(store.getState().round.snake).toEqual(snake);
    store.getState().resume();
    expect(store.getState().round.status).toBe("playing");
    expect(storage.setItem).toHaveBeenCalledTimes(writes);
    store.getState().chooseMode("rush");
    expect(store.getState().mode).toBe("classic");
  });
  it("validates malformed saved values", async () => {
    const storage = memory();
    storage.data.set(
      "moobi-snake",
      JSON.stringify({
        state: {
          records: { classic: -20, rush: "900" },
          games: 3.5,
          mode: "unknown",
        },
        version: 0,
      }),
    );
    const store = createSnakeStore(storage);
    await store.persist.rehydrate();
    expect(store.getState().records).toEqual({
      mellow: 0,
      classic: 0,
      rush: 0,
    });
    expect(store.getState().games).toBe(0);
    expect(store.getState().mode).toBe("classic");
  });
  it("renders useful first-use context and accessible difficulty controls", () => {
    const html = renderToStaticMarkup(createElement(SnakeGame));
    expect(html).toContain("YOUR PERSONAL BEST");
    expect(html).toContain("Let’s play");
    expect(html).toContain('aria-label="How to play"');
    expect(html).toContain('aria-label="Game difficulty"');
    expect(html).toContain('aria-pressed="true"');
  });
});
