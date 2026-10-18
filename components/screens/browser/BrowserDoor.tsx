import { useEffect, useState } from "react";
import styles from "./door.module.css";
export type DoorStage =
  "checking" | "loading" | "blocked" | "leaving" | "external";
const script: Record<DoorStage, string> = {
  checking: "Finding the entrance…",
  loading: "Opening the door…",
  blocked: "This door is locked.",
  leaving: "Taking the side door…",
  external: "Continue in a new tab.",
};
export default function BrowserDoor({
  stage,
  active,
  host,
  url,
  onOpen,
}: {
  stage: DoorStage;
  active: boolean;
  host: string;
  url: string;
  onOpen: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return (
    <div
      className={styles.scene}
      data-stage={stage}
      data-paused={hidden || !active}
    >
      <div className={styles.illustration} aria-hidden="true">
        <div className={styles.halo} />
        <div className={styles.doorFrame}>
          <div className={styles.light} />
          <div className={styles.door}>
            <span className={styles.window} />
            <span className={styles.handle} />
          </div>
        </div>
        <div className={styles.person}>
          <div className={styles.head}>
            <i />
            <i />
          </div>
          <div className={styles.body} />
          <div className={styles.arm} />
          <div className={styles.legLeft} />
          <div className={styles.legRight} />
        </div>
        <span className={styles.knock}>✦</span>
        <div className={styles.ground} />
      </div>
      <p className={styles.host}>{host}</p>
      <p className={styles.script} role="status" aria-live="polite">
        {script[stage]}
      </p>
      <a
        onClick={onOpen}
        className={styles.open}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open site <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
