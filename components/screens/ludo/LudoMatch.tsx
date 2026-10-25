"use client";

import { useRef, useState } from "react";
import { LuArrowLeft, LuCrown } from "react-icons/lu";
import LudoRoyaleIcon from "@/components/icons/LudoRoyaleIcon";
import { useLudoStore } from "@/stores/useLudoStore";
import LudoBoard from "./LudoBoard";
import styles from "./ludo.module.css";
import { useLudoMatchController } from "./useLudoMatchController";

export default function LudoMatch() {
  const leave = useLudoStore((state) => state.leave);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const leaveButtonRef = useRef<HTMLButtonElement>(null);
  const {
    game,
    active,
    selectedDie,
    setSelectedDie,
    rolling,
    visualDice,
    diceLandings,
    movingSeed,
    beginRoll,
    animateMove,
  } = useLudoMatchController();

  if (!game || !active) return null;
  const winner = game.players.find((player) => player.id === game.winnerId);
  const closeLeaveDialog = () => {
    setConfirmLeave(false);
    window.requestAnimationFrame(() => leaveButtonRef.current?.focus());
  };

  return (
    <div className={styles.match} data-active={active.color}>
      <header className={styles.matchHeader}>
        <button
          ref={leaveButtonRef}
          type="button"
          onClick={() => setConfirmLeave(true)}
          aria-label="Leave match"
        >
          <LuArrowLeft />
        </button>
        <div>
          <span className={styles.brandIcon}>
            <LudoRoyaleIcon aria-hidden="true" />
          </span>
          <span>LUDO ROYALE</span>
        </div>
        <span className={styles.turnNumber}>
          {game.protection === "safe" ? "PROTECTED" : "OPEN"} ·{" "}
          {game.captureStyle === "leave" ? "LEAVE" : "RACE"}
        </span>
      </header>
      <LudoBoard
        game={game}
        selectedDie={selectedDie}
        onSelectDie={setSelectedDie}
        rolling={rolling}
        diceValues={visualDice}
        diceLandings={diceLandings}
        movingSeed={movingSeed}
        onRoll={beginRoll}
        onMove={animateMove}
      />
      {(winner || confirmLeave) && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ludo-dialog-title"
          onKeyDown={(event) =>
            event.key === "Escape" && !winner && closeLeaveDialog()
          }
        >
          <div className={styles.dialog}>
            {winner ? (
              <>
                <span className={styles.winnerAvatar}>{winner.avatar}</span>
                <LuCrown className={styles.winnerCrown} />
                <small>EVERY SEED IS SCORED</small>
                <h2 id="ludo-dialog-title">{winner.name} wins.</h2>
                <p>
                  {game.captureStyle === "leave"
                    ? "Captured rivals and finished the race."
                    : "A clean run around the board."}
                </p>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={leave}
                  autoFocus
                >
                  Play another
                </button>
              </>
            ) : (
              <>
                <small>MATCH IN PROGRESS</small>
                <h2 id="ludo-dialog-title">Leave the board?</h2>
                <p>
                  This live match isn&apos;t saved, but your record and setup are.
                </p>
                <button
                  type="button"
                  className={styles.danger}
                  onClick={leave}
                  autoFocus
                >
                  Leave match
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={closeLeaveDialog}
                >
                  Keep playing
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
