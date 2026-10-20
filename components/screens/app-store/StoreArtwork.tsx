import { LuDisc3 } from "react-icons/lu";
import type { MiniAppId } from "@/lib/app-registry";
import styles from "./store.module.css";

/** Lightweight editorial art. Actual app screenshots are shown separately. */
export default function StoreArtwork({ id }: { id: MiniAppId }) {
  return (
    <div className={styles.artwork} data-app={id} aria-hidden="true">
      {id === "music-player" ? (
        <div className={styles.record}>
          <LuDisc3 />
          <span>f.</span>
        </div>
      ) : id === "chess" ? (
        <div className={styles.chessArt}>
          <span>♞</span>
          <span>♙</span>
        </div>
      ) : id === "guess" ? (
        <div className={styles.numberArt}>
          <span>25</span>
          <strong>?</strong>
          <span>75</span>
        </div>
      ) : (
        <svg viewBox="0 0 320 180" fill="none">
          <defs>
            <pattern
              id="store-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path d="M20 0H0V20" stroke="currentColor" opacity=".09" />
            </pattern>
          </defs>
          <rect width="320" height="180" fill="url(#store-grid)" />
          <path
            d="M70 130H130V70H210V110H250"
            stroke="currentColor"
            strokeWidth="23"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="254" cy="106" r="2.5" fill="var(--phone-canvas)" />
          <circle cx="254" cy="114" r="2.5" fill="var(--phone-canvas)" />
          <circle cx="72" cy="50" r="9" fill="currentColor" opacity=".45" />
        </svg>
      )}
    </div>
  );
}
