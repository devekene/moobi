"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  availableDice,
  chooseBotMove,
  forcedSeedMove,
  seedMovementFrames,
  type DicePair,
} from "@/lib/ludo";
import { useLudoStore } from "@/stores/useLudoStore";
import {
  CENTER_DICE_LANDINGS,
  randomDiceLandings,
  type DiceLandings,
  type MovingSeed,
} from "./ludo-motion";

export function useLudoMatchController() {
  const game = useLudoStore((state) => state.game);
  const [selectedDie, setSelectedDie] = useState<0 | 1 | null>(null);
  const [rolling, setRolling] = useState(false);
  const [visualDice, setVisualDice] = useState<DicePair>([1, 6]);
  const [diceLandings, setDiceLandings] = useState<DiceLandings>(
    CENTER_DICE_LANDINGS,
  );
  const [movingSeed, setMovingSeed] = useState<MovingSeed | null>(null);
  const timersRef = useRef<Set<number>>(new Set());
  const rollingRef = useRef(false);
  const movingRef = useRef(false);
  const active = game?.players[game.currentPlayer];

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      rollingRef.current = false;
      movingRef.current = false;
    };
  }, []);

  const beginRoll = useCallback(() => {
    const snapshot = useLudoStore.getState().game;
    if (
      !snapshot ||
      snapshot.phase !== "roll" ||
      snapshot.winnerId ||
      rollingRef.current ||
      movingRef.current
    )
      return;
    const result: DicePair = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    rollingRef.current = true;
    setSelectedDie(null);
    setDiceLandings(randomDiceLandings());
    setRolling(true);
    const tumble = (frames: number) => {
      if (frames <= 0 || !rollingRef.current) return;
      setVisualDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
      schedule(() => tumble(frames - 1), 85);
    };
    tumble(reduceMotion ? 1 : 9);
    schedule(
      () => {
        setVisualDice(result);
        setRolling(false);
        rollingRef.current = false;
        useLudoStore.getState().roll(result);
      },
      reduceMotion ? 180 : 900,
    );
    schedule(
      () => setDiceLandings(CENTER_DICE_LANDINGS),
      reduceMotion ? 220 : 1350,
    );
  }, [schedule]);

  const animateMove = useCallback(
    (seedIndex: number, dieIndexes: readonly (0 | 1)[]) => {
      const snapshot = useLudoStore.getState().game;
      if (
        !snapshot ||
        snapshot.dice === null ||
        !dieIndexes.length ||
        rollingRef.current ||
        movingRef.current
      )
        return;
      const player = snapshot.players[snapshot.currentPlayer];
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      movingRef.current = true;
      const finish = () => {
        setMovingSeed(null);
        movingRef.current = false;
      };
      const advanceDie = (sequenceIndex: number) => {
        const current = useLudoStore.getState().game;
        const dieIndex = dieIndexes[sequenceIndex];
        if (
          !current ||
          current.dice === null ||
          !current.remainingDice[dieIndex] ||
          current.players[current.currentPlayer].id !== player.id
        ) {
          finish();
          return;
        }
        const frames = seedMovementFrames(
          current.seeds[player.id][seedIndex],
          current.dice[dieIndex],
        );
        if (!frames.length) {
          finish();
          return;
        }
        setSelectedDie(dieIndex);
        const advanceFrame = (frameIndex: number) => {
          setMovingSeed({
            playerId: player.id,
            seedIndex,
            progress: frames[frameIndex],
          });
          if (frameIndex < frames.length - 1) {
            schedule(
              () => advanceFrame(frameIndex + 1),
              reduceMotion ? 35 : 210,
            );
            return;
          }
          schedule(() => {
            useLudoStore.getState().move(seedIndex, dieIndex);
            if (sequenceIndex < dieIndexes.length - 1) {
              schedule(
                () => advanceDie(sequenceIndex + 1),
                reduceMotion ? 20 : 90,
              );
            } else finish();
          }, reduceMotion ? 55 : 230);
        };
        advanceFrame(0);
      };
      advanceDie(0);
    },
    [schedule],
  );

  useEffect(() => {
    if (
      !game ||
      !active ||
      active.controller !== "bot" ||
      game.winnerId ||
      rolling ||
      movingSeed
    )
      return;
    const timer = window.setTimeout(
      () => {
        if (game.phase === "roll") beginRoll();
        else {
          const choice = chooseBotMove(game);
          if (choice) animateMove(choice.seedIndex, [choice.dieIndex]);
        }
      },
      game.phase === "roll" ? 1100 : 620,
    );
    return () => window.clearTimeout(timer);
  }, [active, animateMove, beginRoll, game, movingSeed, rolling]);

  const usableDice = game ? availableDice(game) : [];
  const automaticMove = game ? forcedSeedMove(game) : null;
  const effectiveSelectedDie =
    selectedDie !== null && usableDice.includes(selectedDie)
      ? selectedDie
      : !automaticMove && usableDice.length === 1
        ? usableDice[0]
        : null;

  return {
    game,
    active,
    selectedDie: effectiveSelectedDie,
    setSelectedDie,
    rolling,
    visualDice,
    diceLandings,
    movingSeed,
    beginRoll,
    animateMove,
  };
}
