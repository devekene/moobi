import type { CSSProperties } from "react";
import { availableDice, type DicePair, type LudoGame } from "@/lib/ludo";
import type { DiceLandings, DieLanding } from "./ludo-motion";
import styles from "./ludo.module.css";

const DIE_DOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

type DieButtonStyle = CSSProperties & {
  "--die-x": string;
  "--die-y": string;
};

function dieButtonStyle([x, y]: DieLanding): DieButtonStyle {
  return { "--die-x": `${x}px`, "--die-y": `${y}px` };
}

function DieFace({ value }: { value: number }) {
  return (
    <span className={styles.dieFace} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <i key={index} data-on={DIE_DOTS[value].includes(index)} />
      ))}
    </span>
  );
}

function DieCube({ value }: { value: number }) {
  return (
    <span className={styles.dieScene} aria-hidden="true">
      <span className={styles.dieCube} data-value={value}>
        {([1, 6, 3, 4, 2, 5] as const).map((face) => (
          <span key={face} className={styles.dieSide} data-face={face}>
            <DieFace value={face} />
          </span>
        ))}
      </span>
    </span>
  );
}

export default function LudoDice({
  game,
  selectedDie,
  rolling,
  values,
  landings,
  busy,
  canRoll,
  onRoll,
  onSelect,
}: {
  game: LudoGame;
  selectedDie: 0 | 1 | null;
  rolling: boolean;
  values: DicePair;
  landings: DiceLandings;
  busy: boolean;
  canRoll: boolean;
  onRoll: () => void;
  onSelect: (index: 0 | 1) => void;
}) {
  const usable = new Set(availableDice(game));
  return (
    <div className={styles.boardDice} data-rolling={rolling}>
      {([0, 1] as const).map((index) => (
        <button
          type="button"
          key={index}
          style={dieButtonStyle(landings[index])}
          disabled={busy || (!canRoll && !usable.has(index))}
          data-selected={selectedDie === index}
          data-used={game.dice !== null && !game.remainingDice[index]}
          onClick={canRoll ? onRoll : () => onSelect(index)}
          aria-label={
            canRoll
              ? "Roll both dice"
              : game.dice
                ? `${selectedDie === index ? "Selected" : "Select"} die ${index + 1}, value ${game.dice[index]}`
                : "Dice waiting to roll"
          }
        >
          <DieCube value={values[index]} />
        </button>
      ))}
    </div>
  );
}
