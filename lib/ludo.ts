export type LudoColor = "blue" | "yellow" | "green" | "red";
export type LudoMode = "solo" | "duel" | "party";
export type LudoStrategy = "bold" | "balanced" | "tactical";
export type LudoProtection = "safe" | "open";
export type LudoController = "human" | "bot";
export type LudoPhase = "roll" | "move" | "complete";
export type DicePair = readonly [number, number];

export type LudoPlayer = {
  id: string;
  name: string;
  avatar: string;
  color: LudoColor;
  controller: LudoController;
  strategy: LudoStrategy;
};

export type LudoGame = {
  mode: LudoMode;
  protection: LudoProtection;
  players: LudoPlayer[];
  seeds: Record<string, number[]>;
  currentPlayer: number;
  phase: LudoPhase;
  dice: DicePair | null;
  remainingDice: readonly [boolean, boolean];
  turn: number;
  winnerId: string | null;
  lastEvent: string;
};

export type BotMove = { dieIndex: 0 | 1; seedIndex: number };
export type ForcedSeedMove = {
  seedIndex: number;
  dieIndexes: readonly (0 | 1)[];
};

export const LUDO_COLORS: readonly LudoColor[] = ["blue", "yellow", "green", "red"];
export const LUDO_MODES = {
  solo: { name: "Solo League", detail: "You against three rival captains", players: 4 },
  duel: { name: "Quick Duel", detail: "A focused two-player face-off", players: 2 },
  party: { name: "Pass & Play", detail: "Four friends, one phone, all the drama", players: 4 },
} satisfies Record<LudoMode, { name: string; detail: string; players: number }>;
export const LUDO_STRATEGIES = {
  bold: { name: "Bold", detail: "Hungry for captures" },
  balanced: { name: "Balanced", detail: "A little risk, a little patience" },
  tactical: { name: "Tactical", detail: "Protects leads and avoids threats" },
} satisfies Record<LudoStrategy, { name: string; detail: string }>;
export const LUDO_PROTECTION_RULES = {
  safe: {
    name: "Protected Board",
    detail: "Starts and stars are safe from captures",
  },
  open: {
    name: "Open Board",
    detail: "Every square on the shared track can be captured",
  },
} satisfies Record<LudoProtection, { name: string; detail: string }>;

export const TRACK: readonly (readonly [number, number])[] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
] as const;

export const START_INDEX: Record<LudoColor, number> = {
  blue: 0,
  yellow: 13,
  green: 26,
  red: 39,
};
export const SAFE_TRACK_INDEXES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const HOME_PROGRESS = 57;

const BOT_PROFILES: ReadonlyArray<Omit<LudoPlayer, "strategy">> = [
  { id: "maji", name: "Maji", avatar: "🐼", color: "green", controller: "bot" },
  { id: "sol", name: "Sol", avatar: "🦁", color: "yellow", controller: "bot" },
  { id: "zuri", name: "Zuri", avatar: "🐯", color: "blue", controller: "bot" },
];

export function createLudoGame(
  mode: LudoMode,
  avatar: string,
  strategy: LudoStrategy,
  protection: LudoProtection = "safe",
): LudoGame {
  const human: LudoPlayer = {
    id: "you",
    name: mode === "party" ? "Player 1" : "You",
    avatar,
    color: "red",
    controller: "human",
    strategy,
  };
  const rivals = BOT_PROFILES.slice(0, mode === "duel" ? 1 : 3).map(
    (profile, index): LudoPlayer => ({
      ...profile,
      name: mode === "party" ? `Player ${index + 2}` : profile.name,
      controller: mode === "party" ? "human" : "bot",
      strategy,
    }),
  );
  const players = [human, ...rivals];
  return {
    mode,
    protection,
    players,
    seeds: Object.fromEntries(players.map((player) => [player.id, [-1, -1, -1, -1]])),
    currentPlayer: 0,
    phase: "roll",
    dice: null,
    remainingDice: [false, false],
    turn: 1,
    winnerId: null,
    lastEvent: `${human.name} opens the match`,
  };
}

export function globalTrackIndex(color: LudoColor, progress: number): number | null {
  if (progress < 0 || progress > 51) return null;
  return (START_INDEX[color] + progress) % TRACK.length;
}

function canMove(progress: number, die: number): boolean {
  if (progress === HOME_PROGRESS) return false;
  if (progress === -1) return die === 6;
  return progress + die <= HOME_PROGRESS;
}

export function seedMovementFrames(progress: number, die: number): number[] {
  if (progress === -1) return die === 6 ? [0] : [];
  if (progress < 0 || progress === HOME_PROGRESS || progress + die > HOME_PROGRESS)
    return [];
  return Array.from({ length: die }, (_, index) => progress + index + 1);
}

export function movableSeeds(game: LudoGame, dieIndex?: 0 | 1): number[] {
  if (game.phase !== "move" || game.dice === null) return [];
  const player = game.players[game.currentPlayer];
  const indexes: readonly (0 | 1)[] = dieIndex === undefined ? [0, 1] : [dieIndex];
  return game.seeds[player.id]
    .map((progress, index) => ({ progress, index }))
    .filter(({ progress }) =>
      indexes.some((index) => game.remainingDice[index] && canMove(progress, game.dice![index])),
    )
    .map(({ index }) => index);
}

export function availableDice(game: LudoGame): (0 | 1)[] {
  if (game.phase !== "move" || game.dice === null) return [];
  return ([0, 1] as const).filter(
    (index) => game.remainingDice[index] && movableSeeds(game, index).length > 0,
  );
}

function canConsumeDice(
  game: LudoGame,
  seedIndex: number,
  dieIndexes: readonly (0 | 1)[],
): boolean {
  if (game.dice === null) return false;
  const player = game.players[game.currentPlayer];
  let progress = game.seeds[player.id][seedIndex];
  for (const dieIndex of dieIndexes) {
    if (!game.remainingDice[dieIndex]) return false;
    const frames = seedMovementFrames(progress, game.dice[dieIndex]);
    if (!frames.length) return false;
    progress = frames[frames.length - 1];
  }
  return true;
}

export function forcedSeedMove(game: LudoGame): ForcedSeedMove | null {
  const dieIndexes = ([0, 1] as const).filter(
    (index) => game.remainingDice[index],
  );
  if (game.phase !== "move" || game.dice === null || dieIndexes.length < 2)
    return null;

  const seedIndexes = new Set(
    dieIndexes.flatMap((dieIndex) => movableSeeds(game, dieIndex)),
  );
  if (seedIndexes.size !== 1) return null;

  const seedIndex = [...seedIndexes][0];
  const orders: readonly (readonly (0 | 1)[])[] = [
    dieIndexes,
    [dieIndexes[1], dieIndexes[0]],
  ];
  const dieOrder = orders.find((order) =>
    canConsumeDice(game, seedIndex, order),
  );
  return dieOrder ? { seedIndex, dieIndexes: dieOrder } : null;
}

function nextTurn(game: LudoGame, message: string): LudoGame {
  return {
    ...game,
    currentPlayer: (game.currentPlayer + 1) % game.players.length,
    phase: "roll",
    dice: null,
    remainingDice: [false, false],
    turn: game.turn + 1,
    lastEvent: message,
  };
}

export function rollLudo(game: LudoGame, values: DicePair): LudoGame {
  if (game.phase !== "roll" || game.winnerId) return game;
  const clampDie = (value: number) =>
    Math.max(1, Math.min(6, Math.floor(value)));
  const dice: DicePair = [clampDie(values[0]), clampDie(values[1])];
  const player = game.players[game.currentPlayer];
  const rolled: LudoGame = {
    ...game,
    dice,
    remainingDice: [true, true],
    phase: "move",
    lastEvent: `${player.name} rolled ${dice[0]} and ${dice[1]}`,
  };
  return availableDice(rolled).length
    ? rolled
    : nextTurn(rolled, `${player.name} rolled ${dice[0]} and ${dice[1]} · no legal move`);
}

function landingCount(game: LudoGame, player: LudoPlayer, progress: number): number {
  const target = globalTrackIndex(player.color, progress);
  if (target === null) return 0;
  if (game.protection === "safe" && SAFE_TRACK_INDEXES.has(target)) return 0;
  return game.players.reduce((count, other) =>
    other.id === player.id
      ? count
      : count + game.seeds[other.id].filter(
          (seed) => globalTrackIndex(other.color, seed) === target,
        ).length,
  0);
}

export function moveLudoSeed(game: LudoGame, seedIndex: number, dieIndex: 0 | 1): LudoGame {
  if (
    game.dice === null ||
    !game.remainingDice[dieIndex] ||
    !movableSeeds(game, dieIndex).includes(seedIndex)
  ) return game;
  const player = game.players[game.currentPlayer];
  const die = game.dice[dieIndex];
  const seeds = Object.fromEntries(
    Object.entries(game.seeds).map(([id, values]) => [id, [...values]]),
  );
  const previous = seeds[player.id][seedIndex];
  const progress = previous === -1 ? 0 : previous + die;
  seeds[player.id][seedIndex] = progress;
  const target = globalTrackIndex(player.color, progress);
  let captures = 0;
  if (
    target !== null &&
    (game.protection === "open" || !SAFE_TRACK_INDEXES.has(target))
  ) {
    for (const other of game.players) {
      if (other.id === player.id) continue;
      seeds[other.id] = seeds[other.id].map((seed) => {
        if (globalTrackIndex(other.color, seed) !== target) return seed;
        captures++;
        return -1;
      });
    }
  }
  if (seeds[player.id].every((seed) => seed === HOME_PROGRESS))
    return {
      ...game,
      seeds,
      phase: "complete",
      dice: null,
      remainingDice: [false, false],
      winnerId: player.id,
      lastEvent: `${player.name} brings every seed home!`,
    };
  const remainingDice: [boolean, boolean] = [...game.remainingDice];
  remainingDice[dieIndex] = false;
  const message = captures
    ? `${player.name} sent ${captures} seed${captures === 1 ? "" : "s"} home`
    : progress === HOME_PROGRESS
      ? `${player.name} brought a seed home`
      : `${player.name} moved seed ${seedIndex + 1} by ${die}`;
  const moved: LudoGame = { ...game, seeds, remainingDice, lastEvent: message };
  if (availableDice(moved).length) return moved;
  if (game.dice[0] === game.dice[1])
    return {
      ...moved,
      phase: "roll",
      dice: null,
      remainingDice: [false, false],
      lastEvent: `${message} · doubles, roll again`,
    };
  return nextTurn(moved, message);
}

export function chooseBotMove(game: LudoGame): BotMove | null {
  if (game.dice === null) return null;
  const player = game.players[game.currentPlayer];
  const candidates = availableDice(game).flatMap((dieIndex) =>
    movableSeeds(game, dieIndex).map((seedIndex) => ({ dieIndex, seedIndex })),
  );
  const score = ({ dieIndex, seedIndex }: BotMove) => {
    const previous = game.seeds[player.id][seedIndex];
    const progress = previous === -1 ? 0 : previous + game.dice![dieIndex];
    const target = globalTrackIndex(player.color, progress);
    const capture = landingCount(game, player, progress);
    const safe =
      game.protection === "safe" &&
      target !== null &&
      SAFE_TRACK_INDEXES.has(target);
    const home = progress === HOME_PROGRESS;
    if (player.strategy === "bold")
      return capture * 1000 + (previous === -1 ? 80 : 0) + progress + (home ? 500 : 0);
    if (player.strategy === "tactical")
      return (home ? 1000 : 0) + (safe ? 280 : 0) + capture * 220 + progress * 2;
    return (home ? 900 : 0) + capture * 500 + (previous === -1 ? 120 : 0) + progress;
  };
  return candidates.sort((a, b) => score(b) - score(a) || a.dieIndex - b.dieIndex)[0] ?? null;
}

export function playerProgress(game: LudoGame, playerId: string): number {
  return game.seeds[playerId].reduce(
    (total, seed) => total + (seed < 0 ? 0 : Math.min(seed + 1, HOME_PROGRESS + 1)),
    0,
  );
}
