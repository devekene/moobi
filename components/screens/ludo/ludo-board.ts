import type { CSSProperties } from "react";
import {
  globalTrackIndex,
  HOME_LANE_START_PROGRESS,
  START_INDEX,
  TRACK,
  type LudoColor,
  type LudoGame,
  type LudoPlayer,
} from "@/lib/ludo";

export const LUDO_COLORS: readonly LudoColor[] = [
  "blue",
  "yellow",
  "red",
  "green",
];

export const COLOR_LABELS: Record<LudoColor, string> = {
  blue: "Blue",
  yellow: "Yellow",
  green: "Green",
  red: "Red",
};

export const BASE_CAPTAINS: Record<
  LudoColor,
  Pick<LudoPlayer, "name" | "avatar">
> = {
  blue: { name: "Zuri", avatar: "🐯" },
  yellow: { name: "Sol", avatar: "🦁" },
  green: { name: "Maji", avatar: "🐼" },
  red: { name: "Ruby", avatar: "🦊" },
};

export function baseCaptain(
  game: LudoGame,
  color: LudoColor,
): Pick<LudoPlayer, "name" | "avatar"> {
  const player = game.players.find((candidate) => candidate.color === color);
  return player
    ? { name: player.name, avatar: player.avatar }
    : BASE_CAPTAINS[color];
}

export const HOME_LANES: Record<
  LudoColor,
  readonly (readonly [number, number])[]
> = {
  blue: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ],
  yellow: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],
  ],
  green: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8],
  ],
  red: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7],
  ],
};

const YARDS: Record<LudoColor, readonly (readonly [number, number])[]> = {
  blue: [
    [1, 1],
    [1, 4],
    [4, 1],
    [4, 4],
  ],
  yellow: [
    [1, 10],
    [1, 13],
    [4, 10],
    [4, 13],
  ],
  green: [
    [10, 10],
    [10, 13],
    [13, 10],
    [13, 13],
  ],
  red: [
    [10, 1],
    [10, 4],
    [13, 1],
    [13, 4],
  ],
};

export const HOME_AREAS: Record<LudoColor, CSSProperties> = {
  blue: { top: 0, left: 0, width: "40%", height: "40%" },
  yellow: { top: 0, left: "60%", width: "40%", height: "40%" },
  red: { top: "60%", left: 0, width: "40%", height: "40%" },
  green: { top: "60%", left: "60%", width: "40%", height: "40%" },
};

export const START_ARROWS: Record<number, string> = {
  0: "→",
  13: "↓",
  26: "←",
  39: "↑",
};

export function ludoBoardCellColor(
  row: number,
  col: number,
): LudoColor | "path" | "center" | "empty" {
  if (
    (row <= 5 && (col <= 5 || col >= 9)) ||
    (row >= 9 && (col <= 5 || col >= 9))
  )
    return "empty";
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return "center";
  for (const color of LUDO_COLORS)
    if (
      HOME_LANES[color]
        .slice(0, 5)
        .some(([laneRow, laneCol]) => laneRow === row && laneCol === col)
    )
      return color;
  const trackIndex = TRACK.findIndex(
    ([trackRow, trackCol]) => trackRow === row && trackCol === col,
  );
  if (trackIndex >= 0)
    return (
      LUDO_COLORS.find((color) => START_INDEX[color] === trackIndex) ?? "path"
    );
  return "empty";
}

export function seedPosition(
  color: LudoColor,
  progress: number,
  index: number,
) {
  if (progress < 0) return YARDS[color][index];
  if (progress >= HOME_LANE_START_PROGRESS)
    return HOME_LANES[color][progress - HOME_LANE_START_PROGRESS];
  return TRACK[globalTrackIndex(color, progress) ?? 0];
}
