import {
  LuBot,
  LuCheck,
  LuChevronRight,
  LuCrown,
  LuDices,
  LuShieldCheck,
  LuSparkles,
  LuSwords,
  LuTrophy,
  LuUsers,
} from "react-icons/lu";
import {
  LUDO_MODES,
  LUDO_PROTECTION_RULES,
  LUDO_STRATEGIES,
  type LudoMode,
  type LudoProtection,
  type LudoStrategy,
} from "@/lib/ludo";
import { LUDO_AVATARS, useLudoStore } from "@/stores/useLudoStore";
import { LUDO_COLORS } from "./ludo-board";
import styles from "./ludo.module.css";

const MODES: LudoMode[] = ["solo", "duel", "party"];
const PROTECTION_RULES: LudoProtection[] = ["safe", "open"];
const STRATEGIES: LudoStrategy[] = ["bold", "balanced", "tactical"];

export default function LudoSetup() {
  const {
    mode,
    protection,
    strategy,
    avatar,
    games,
    wins,
    chooseMode,
    chooseProtection,
    chooseStrategy,
    chooseAvatar,
    start,
  } = useLudoStore();

  return (
    <div className={styles.setup}>
      <header className={styles.heroHeader}>
        <div className={styles.brandMark}>
          <LuCrown />
          <span>LUDO</span>
        </div>
        <span className={styles.edition}>CLASSIC BOARD · TWO DICE</span>
      </header>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span>THE CLASSIC RACE</span>
          <h1>
            Roll. Move.
            <br />
            <em>Get home.</em>
          </h1>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.heroBoard}>
            {LUDO_COLORS.map((color) => (
              <i key={color} data-color={color} />
            ))}
            <span>
              <b>⚄</b>
              <b>⚂</b>
            </span>
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
