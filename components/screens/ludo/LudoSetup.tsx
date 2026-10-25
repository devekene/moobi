import Image from "next/image";
import {
  LuBot,
  LuCheck,
  LuChevronRight,
  LuDices,
  LuShieldCheck,
  LuSparkles,
  LuSwords,
  LuTrophy,
  LuUsers,
} from "react-icons/lu";
import LudoRoyaleIcon from "@/components/icons/LudoRoyaleIcon";
import {
  LUDO_MODES,
  LUDO_CAPTURE_STYLES,
  LUDO_PROTECTION_RULES,
  LUDO_STRATEGIES,
  type LudoCaptureStyle,
  type LudoMode,
  type LudoProtection,
  type LudoStrategy,
} from "@/lib/ludo";
import { LUDO_AVATARS, useLudoStore } from "@/stores/useLudoStore";
import styles from "./ludo.module.css";

const MODES: LudoMode[] = ["solo", "duel", "party"];
const PROTECTION_RULES: LudoProtection[] = ["safe", "open"];
const CAPTURE_STYLES: LudoCaptureStyle[] = ["continue", "leave"];
const STRATEGIES: LudoStrategy[] = ["bold", "balanced", "tactical"];

export default function LudoSetup() {
  const {
    mode,
    protection,
    captureStyle,
    strategy,
    avatar,
    games,
    wins,
    chooseMode,
    chooseProtection,
    chooseCaptureStyle,
    chooseStrategy,
    chooseAvatar,
    start,
  } = useLudoStore();

  return (
    <div className={styles.setup}>
      <header className={styles.heroHeader}>
        <div className={styles.brandMark}>
          <span className={styles.brandIcon}>
            <LudoRoyaleIcon aria-hidden="true" />
          </span>
          <span>LUDO ROYALE</span>
        </div>
        <span className={styles.edition}>CLASSIC BOARD · TWO DICE</span>
      </header>
      <section className={styles.hero}>
        <Image
          className={styles.heroImage}
          src="/images/ludo-capture-icon.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 520px) 100vw, 430px"
        />
        <div className={styles.heroCopy}>
          <span>CAPTURE OR RETURN TO BASE</span>
          <h1>
            Hunt the board.
            <br />
            <em>Own the escape.</em>
          </h1>
          <p>Two dice. Four captains. Every move can send someone home.</p>
          <div className={styles.heroTags} aria-hidden="true">
            <span>CAPTURE</span>
            <i />
            <span>ESCAPE</span>
          </div>
        </div>
      </section>
      <section className={styles.recordStrip} aria-label="Player record">
        <div>
          <LuTrophy />
          <span>
            <b>{wins}</b> wins
          </span>
        </div>
        <i />
        <div>
          <LuSparkles />
          <span>
            <b>{games}</b> matches
          </span>
        </div>
        <i />
        <div>
          <LuShieldCheck />
          <span>
            <b>{games ? Math.round((wins / games) * 100) : 0}%</b> win rate
          </span>
        </div>
      </section>
      <section className={styles.setupSection}>
        <div className={styles.sectionTitle}>
          <span>Choose your captain</span>
          <small>Your avatar</small>
        </div>
        <div
          className={styles.avatars}
          role="group"
          aria-label="Captain avatar"
        >
          {LUDO_AVATARS.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={`Use ${item} avatar`}
              aria-pressed={avatar === item}
              onClick={() => chooseAvatar(item)}
            >
              {item}
              {avatar === item && <LuCheck />}
            </button>
          ))}
        </div>
      </section>
      <section className={styles.setupSection}>
        <div className={styles.sectionTitle}>
          <span>How do you want to play?</span>
          <small>Playstyle</small>
        </div>
        <div
          className={styles.modeCards}
          role="radiogroup"
          aria-label="Playstyle"
        >
          {MODES.map((item) => {
            const Icon =
              item === "solo" ? LuBot : item === "duel" ? LuSwords : LuUsers;
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={mode === item}
                className={mode === item ? styles.selected : ""}
                onClick={() => chooseMode(item)}
              >
                <Icon />
                <span>
                  <b>{LUDO_MODES[item].name}</b>
                  <small>{LUDO_MODES[item].detail}</small>
                </span>
                <LuChevronRight />
              </button>
            );
          })}
        </div>
      </section>
      <section className={styles.setupSection}>
        <div className={styles.sectionTitle}>
          <span>Choose the capture rules</span>
          <small>Board safety</small>
        </div>
        <div
          className={styles.ruleCards}
          role="radiogroup"
          aria-label="Board protection"
        >
          {PROTECTION_RULES.map((item) => {
            const Icon = item === "safe" ? LuShieldCheck : LuSwords;
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={protection === item}
                className={protection === item ? styles.selectedRule : ""}
                onClick={() => chooseProtection(item)}
              >
                <Icon />
                <span>
                  <b>{LUDO_PROTECTION_RULES[item].name}</b>
                  <small>{LUDO_PROTECTION_RULES[item].detail}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className={styles.setupSection}>
        <div className={styles.sectionTitle}>
          <span>What happens after a capture?</span>
          <small>Capture style</small>
        </div>
        <div
          className={styles.ruleCards}
          role="radiogroup"
          aria-label="Capture style"
        >
          {CAPTURE_STYLES.map((item) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={captureStyle === item}
              className={captureStyle === item ? styles.selectedRule : ""}
              onClick={() => chooseCaptureStyle(item)}
            >
              {item === "continue" ? <LuChevronRight /> : <LuTrophy />}
              <span>
                <b>{LUDO_CAPTURE_STYLES[item].name}</b>
                <small>{LUDO_CAPTURE_STYLES[item].detail}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      {mode !== "party" && (
        <section className={styles.setupSection}>
          <div className={styles.sectionTitle}>
            <span>Rival personality</span>
            <small>AI style</small>
          </div>
          <div
            className={styles.strategies}
            role="radiogroup"
            aria-label="Rival personality"
          >
            {STRATEGIES.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={strategy === item}
                onClick={() => chooseStrategy(item)}
              >
                <span
                  className={styles.strategyDot}
                  data-active={strategy === item}
                />
                <b>{LUDO_STRATEGIES[item].name}</b>
                <small>{LUDO_STRATEGIES[item].detail}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      <button type="button" className={styles.primary} onClick={start}>
        <LuDices /> Set the board
      </button>
    </div>
  );
}
