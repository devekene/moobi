"use client";

import { useLudoStore } from "@/stores/useLudoStore";
import LudoMatch from "./LudoMatch";
import LudoSetup from "./LudoSetup";
import styles from "./ludo.module.css";

export default function LudoGame() {
  const game = useLudoStore((state) => state.game);
  return (
    <main className={styles.app}>{game ? <LudoMatch /> : <LudoSetup />}</main>
  );
}
