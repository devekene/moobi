export type MovingSeed = {
  playerId: string;
  seedIndex: number;
  progress: number;
};

export type DieLanding = readonly [x: number, y: number];
export type DiceLandings = readonly [DieLanding, DieLanding];

export const CENTER_DICE_LANDINGS: DiceLandings = [
  [-18, -4],
  [18, 4],
];

export function randomDiceLandings(): DiceLandings {
  return [
    [-54 + Math.floor(Math.random() * 25), -34 + Math.floor(Math.random() * 47)],
    [30 + Math.floor(Math.random() * 25), -12 + Math.floor(Math.random() * 47)],
  ];
}
