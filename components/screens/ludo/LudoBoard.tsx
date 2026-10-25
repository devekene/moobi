import {
  forcedSeedMove,
  HOME_PROGRESS,
  movableSeeds,
  SAFE_TRACK_INDEXES,
  TRACK,
  type DicePair,
  type LudoGame,
} from "@/lib/ludo";
import LudoDice from "./LudoDice";
import {
  HOME_AREAS,
  LUDO_COLORS,
  START_ARROWS,
  ludoBoardCellColor,
  seedPosition,
} from "./ludo-board";
import type { DiceLandings, MovingSeed } from "./ludo-motion";
import styles from "./ludo.module.css";

export default function LudoBoard({
  game,
  selectedDie,
  onSelectDie,
  rolling,
  diceValues,
  diceLandings,
  movingSeed,
  onRoll,
  onMove,
}: {
  game: LudoGame;
  selectedDie: 0 | 1 | null;
  onSelectDie: (index: 0 | 1) => void;
  rolling: boolean;
  diceValues: DicePair;
  diceLandings: DiceLandings;
  movingSeed: MovingSeed | null;
  onRoll: () => void;
  onMove: (seedIndex: number, dieIndexes: readonly (0 | 1)[]) => void;
}) {
  const active = game.players[game.currentPlayer];
  const legal = new Set(
    selectedDie === null ? [] : movableSeeds(game, selectedDie),
  );
  const automaticMove = selectedDie === null ? forcedSeedMove(game) : null;
  const stacks = new Map<string, number>();
  const seedViews = game.players.flatMap((player) =>
    game.seeds[player.id].map((savedProgress, index) => {
      const progress =
        movingSeed?.playerId === player.id && movingSeed.seedIndex === index
          ? movingSeed.progress
          : savedProgress;
      const [row, col] = seedPosition(player.color, progress, index);
      const key = `${row}-${col}`;
      const stack = stacks.get(key) ?? 0;
      stacks.set(key, stack + 1);
      return { player, progress, index, row, col, stack };
    }),
  );
  const canRoll =
    active.controller === "human" &&
    game.phase === "roll" &&
    !game.winnerId &&
    !rolling &&
    movingSeed === null;

  return (
    <div className={styles.boardStage}>
      <div className={styles.boardFrame}>
        <div
          className={styles.board}
          role="group"
          aria-label={`Ludo board with ${game.protection === "safe" ? "protected" : "open"} capture rules. ${active.name}'s turn.`}
        >
          {Array.from({ length: 225 }, (_, cell) => {
            const row = Math.floor(cell / 15);
            const col = cell % 15;
            const color = ludoBoardCellColor(row, col);
            const track = TRACK.findIndex(
              ([trackRow, trackCol]) => trackRow === row && trackCol === col,
            );
            const safe =
              game.protection === "safe" &&
              track >= 0 &&
              SAFE_TRACK_INDEXES.has(track);
            return (
              <span
                key={cell}
                className={styles.cell}
                data-color={color}
                data-safe={safe}
                data-start={track in START_ARROWS}
                style={{ gridRow: row + 1, gridColumn: col + 1 }}
              >
                {track in START_ARROWS ? START_ARROWS[track] : safe ? "☆" : ""}
              </span>
            );
          })}
          {LUDO_COLORS.map((color) => {
            const owner = game.players.find((player) => player.color === color);
            return (
              <span
                key={color}
                className={styles.yardInner}
                data-color={color}
                style={HOME_AREAS[color]}
                aria-hidden="true"
              >
                {owner && <span className={styles.yardAvatar}>{owner.avatar}</span>}
              </span>
            );
          })}
          <span className={styles.centerHome} aria-hidden="true" />
          <LudoDice
            game={game}
            selectedDie={selectedDie}
            rolling={rolling}
            values={diceValues}
            landings={diceLandings}
            busy={rolling || movingSeed !== null}
            canRoll={canRoll}
            onRoll={onRoll}
            onSelect={onSelectDie}
          />
          {seedViews.map(({ player, progress, index, row, col, stack }) => {
            const canMove =
              movingSeed === null &&
              player.id === active.id &&
              ((selectedDie !== null && legal.has(index)) ||
                automaticMove?.seedIndex === index);
            const isMoving =
              movingSeed?.playerId === player.id &&
              movingSeed.seedIndex === index;
            const moveLabel = !canMove
              ? ""
              : automaticMove?.seedIndex === index
                ? ", move with both dice"
                : selectedDie !== null
                  ? `, move with die ${selectedDie + 1}`
                  : "";
            const stackX = stack > 0 ? (stack % 2) * 6 - 3 : 0;
            const stackY = Math.floor(stack / 2) * 6;
            return (
              <button
                key={`${player.id}-${index}`}
                type="button"
                className={styles.seed}
                data-color={player.color}
                data-movable={canMove}
                data-yard={progress < 0}
                data-home={progress === HOME_PROGRESS}
                data-moving={isMoving}
                disabled={!canMove}
                onClick={() => {
                  if (selectedDie !== null) onMove(index, [selectedDie]);
                  else if (automaticMove?.seedIndex === index)
                    onMove(index, automaticMove.dieIndexes);
                }}
                style={{
                  left: `calc(${((col + 0.5) / 15) * 100}% + ${stackX}px)`,
                  top: `calc(${((row + 0.5) / 15) * 100}% + ${stackY}px)`,
                }}
                aria-label={`${player.name} seed ${index + 1}${moveLabel}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
