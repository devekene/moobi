export type Direction = "up" | "down" | "left" | "right";
export type SnakeMode = "mellow" | "classic" | "rush";
export type Point = { x: number; y: number };
export const COLUMNS = 18;
export const ROWS = 22;
export const SNAKE_MODES = {
  mellow: { name: "Mellow", detail: "Easy pace · wrap around", speed: 210 },
  classic: {
    name: "Classic",
    detail: "Find your flow · solid walls",
    speed: 155,
  },
  rush: { name: "Rush", detail: "Quick reflexes · solid walls", speed: 105 },
} satisfies Record<SnakeMode, { name: string; detail: string; speed: number }>;
export type Round = {
  snake: Point[];
  food: Point | null;
  direction: Direction;
  queued: Direction[];
  score: number;
  status: "ready" | "playing" | "paused" | "over" | "won";
};
const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const opposite: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
export function newRound(): Round {
  return {
    snake: [
      { x: 6, y: 11 },
      { x: 5, y: 11 },
      { x: 4, y: 11 },
      { x: 3, y: 11 },
    ],
    food: { x: 12, y: 11 },
    direction: "right",
    queued: [],
    score: 0,
    status: "ready",
  };
}
export function placeFood(snake: Point[], random = Math.random): Point | null {
  const occupied = new Set(snake.map(({ x, y }) => y * COLUMNS + x));
  const free: Point[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLUMNS; x++) {
      if (!occupied.has(y * COLUMNS + x)) free.push({ x, y });
    }
  return free.length
    ? free[
        Math.min(
          free.length - 1,
          Math.floor(Math.max(0, random()) * free.length),
        )
      ]
    : null;
}
export function turn(round: Round, direction: Direction): Round {
  const previous = round.queued.at(-1) ?? round.direction;
  if (
    round.status !== "playing" ||
    round.queued.length >= 2 ||
    direction === previous ||
    direction === opposite[previous]
  )
    return round;
  return { ...round, queued: [...round.queued, direction] };
}
export function advance(
  round: Round,
  mode: SnakeMode,
  random = Math.random,
): Round {
  if (round.status !== "playing") return round;
  const direction = round.queued[0] ?? round.direction;
  const vector = vectors[direction];
  let head = { x: round.snake[0].x + vector.x, y: round.snake[0].y + vector.y };
  if (mode === "mellow")
    head = { x: (head.x + COLUMNS) % COLUMNS, y: (head.y + ROWS) % ROWS };
  const eating = head.x === round.food?.x && head.y === round.food?.y;
  const body = eating ? round.snake : round.snake.slice(0, -1);
  if (
    head.x < 0 ||
    head.x >= COLUMNS ||
    head.y < 0 ||
    head.y >= ROWS ||
    body.some((part) => part.x === head.x && part.y === head.y)
  )
    return { ...round, direction, queued: [], status: "over" };
  const snake = [head, ...round.snake];
  if (!eating) snake.pop();
  const food = eating ? placeFood(snake, random) : round.food;
  return {
    ...round,
    snake,
    food,
    direction,
    queued: round.queued.slice(1),
    score: round.score + (eating ? 10 : 0),
    status: food ? "playing" : "won",
  };
}
