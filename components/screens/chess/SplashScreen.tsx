import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  LuArrowLeft,
  LuChevronDown,
  LuCheck,
  LuInfinity,
  LuRocket,
  LuTimer,
  LuTrophy,
  LuZap,
} from "react-icons/lu";
import {
  TIME_PRESETS,
  getTimePreset,
  type TimeControl,
} from "@/lib/chess-clock";
import { type Difficulty } from "@/lib/chess-game";
import { useGame } from "./GameContext";
import s from "./chess.module.css";

const LEVELS = [
  {
    value: "easy",
    label: "Casual",
    detail: "Easy · A little room to find your rhythm",
  },
  { value: "medium", label: "Club", detail: "Medium · A thoughtful challenge" },
  { value: "hard", label: "Expert", detail: "Hard · Make every move count" },
] as const;
const CATEGORIES = [
  { name: "Bullet", icon: LuRocket },
  { name: "Blitz", icon: LuZap },
  { name: "Rapid", icon: LuTimer },
] as const;
function PaceIcon({ control }: { control: TimeControl }) {
  const category = getTimePreset(control).category;
  const Icon =
    CATEGORIES.find((item) => item.name === category)?.icon ?? LuInfinity;
  return <Icon aria-hidden="true" />;
}

export function TimePicker({
  value,
  onChange,
}: {
  value: TimeControl;
  onChange: (value: TimeControl) => void;
}) {
  return (
    <>
      <p className={s.pickerHint}>
        Time per player. “+” adds seconds after each move.
      </p>
      {CATEGORIES.map(({ name, icon: Icon }) => (
        <section
          key={name}
          className={s.pickerGroup}
          aria-labelledby={`chess-time-${name}`}
        >
          <h2 id={`chess-time-${name}`}>
            <Icon aria-hidden="true" />
            {name}
          </h2>
          <div className={s.presetGrid}>
            {TIME_PRESETS.filter((preset) => preset.category === name).map(
              (preset) => (
                <button
                  key={preset.value}
                  className={s.presetChoice}
                  aria-pressed={value === preset.value}
                  aria-label={`${preset.minutes} ${preset.minutes === 1 ? "minute" : "minutes"} per player${preset.increment ? ` plus ${preset.increment} ${preset.increment === 1 ? "second" : "seconds"} per move` : ""}`}
                  onClick={() => onChange(preset.value)}
                >
                  {preset.label}
                </button>
              ),
            )}
          </div>
        </section>
      ))}
      <button
        className={`${s.presetChoice} ${s.untimed}`}
        aria-pressed={value === 0}
        onClick={() => onChange(0)}
      >
        <LuInfinity aria-hidden="true" /> Untimed <small>Room to think</small>
      </button>
    </>
  );
}

export default function SplashScreen({ onStart }: { onStart: () => void }) {
  const { startGame, timeControl, difficulty } = useGame();
  const [minutes, setMinutes] = useState<TimeControl>(timeControl);
  const [level, setLevel] = useState<Difficulty>(difficulty);
  const [picker, setPicker] = useState<"time" | "level" | null>(null);
  const timeButton = useRef<HTMLButtonElement>(null);
  const levelButton = useRef<HTMLButtonElement>(null);
  const pickerBody = useRef<HTMLDivElement>(null);
  const previousPicker = useRef(picker);
  useEffect(() => {
    if (picker)
      pickerBody.current
        ?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
        ?.focus();
    else if (previousPicker.current)
      (previousPicker.current === "time"
        ? timeButton
        : levelButton
      ).current?.focus();
    previousPicker.current = picker;
  }, [picker]);
  const selectedLevel =
    LEVELS.find((item) => item.value === level) ?? LEVELS[1];

  if (picker)
    return (
      <div
        className={s.setupPicker}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setPicker(null);
          }
        }}
      >
        <header className={s.pickerHeader}>
          <button
            className={s.pickerBack}
            aria-label="Back to game setup"
            onClick={() => setPicker(null)}
          >
            <LuArrowLeft />
          </button>
          <h1>{picker === "time" ? "Time" : "Level"}</h1>
        </header>
        <div className={s.pickerBody} ref={pickerBody}>
          {picker === "time" ? (
            <TimePicker
              value={minutes}
              onChange={(value) => {
                setMinutes(value);
                setPicker(null);
              }}
            />
          ) : (
            <>
              <p className={s.pickerHint}>
                Choose your challenge. You play white.
              </p>
              <div className={s.levelPicker}>
                {LEVELS.map((item) => (
                  <button
                    key={item.value}
                    className={s.levelChoice}
                    aria-pressed={level === item.value}
                    onClick={() => {
                      setLevel(item.value);
                      setPicker(null);
                    }}
                  >
                    <LuTrophy aria-hidden="true" />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    {level === item.value && <LuCheck aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );

  return (
    <div className={s.setup}>
      <div className={s.setupScroller}>
        <div className={s.hero}>
          <div>
            <div className={s.eyebrow}>A game of possibility</div>
            <h1>
              Make your
              <br />
              next move.
            </h1>
          </div>
          <Image
            className={s.heroPiece}
            src="/chess/3d-pieces/wN.webp"
            alt=""
            width={100}
            height={140}
            priority
          />
        </div>
        <div className={s.launchControls}>
          <button
            ref={timeButton}
            className={s.launchSelector}
            aria-label={`Choose time, currently ${getTimePreset(minutes).label}`}
            onClick={() => setPicker("time")}
          >
            <PaceIcon control={minutes} />
            <span>{getTimePreset(minutes).label}</span>
            <LuChevronDown aria-hidden="true" />
          </button>
          <button
            ref={levelButton}
            className={s.launchSelector}
            aria-label={`Choose level, currently ${selectedLevel.label}`}
            onClick={() => setPicker("level")}
          >
            <LuTrophy aria-hidden="true" />
            <span>{selectedLevel.label}</span>
            <LuChevronDown aria-hidden="true" />
          </button>
          <button
            className={`${s.primary} ${s.launchStart}`}
            onClick={() => {
              onStart();
              startGame(level, minutes);
            }}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
