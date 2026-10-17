import { useState } from "react";
import { LuCalculator, LuHistory, LuDelete } from "react-icons/lu";
import { useCalculatorStore } from "@/stores/useCalculatorStore";
import { formatCalculation } from "@/lib/calculator";
import styles from "./calculator.module.css";

const basicKeys = [
  "backspace",
  "AC",
  "%",
  "÷",
  "7",
  "8",
  "9",
  "×",
  "4",
  "5",
  "6",
  "−",
  "1",
  "2",
  "3",
  "+",
  "±",
  "0",
  ".",
  "=",
];
const names: Record<string, string> = {
  backspace: "Delete last character",
  AC: "All clear",
  "%": "Percent",
  "÷": "Divide",
  "×": "Multiply",
  "−": "Subtract",
  "+": "Add",
  "±": "Change sign",
  ".": "Decimal point",
  "=": "Equals",
  "√(": "Square root",
  "^": "Power",
  "!": "Factorial",
  "10^": "Ten to the power",
  π: "Pi",
  angle: "Toggle degrees and radians",
  "(": "Open parenthesis",
  ")": "Close parenthesis",
};

export default function CalculatorBoard({
  onHistory,
}: {
  onHistory: () => void;
}) {
  const { expression, result, degrees, press } = useCalculatorStore();
  const [scientific, setScientific] = useState(false);
  const [second, setSecond] = useState(false);
  const value = formatCalculation(result || expression || "0");
  const scientificKeys = [
    "2nd",
    "angle",
    ...(second ? ["asin(", "acos(", "atan("] : ["sin(", "cos(", "tan("]),
    "^",
    "log(",
    "ln(",
    "(",
    ")",
    "√(",
    "!",
    "10^",
    "π",
    "e",
  ];
  return (
    <div className={styles.board}>
      <header className={styles.toolbar}>
        <button
          type="button"
          className={styles.tool}
          aria-label="Open calculation history"
          onClick={onHistory}
        >
          <LuHistory />
        </button>
        <button
          type="button"
          className={styles.tool}
          aria-label="Scientific calculator"
          aria-pressed={scientific}
          onClick={() => setScientific(!scientific)}
        >
          <LuCalculator />
        </button>
      </header>
      <div className={styles.display}>
        <div className={styles.expression} aria-label="Expression">
          {result ? formatCalculation(expression) : "\u00a0"}
        </div>
        <output
          className={`${styles.result} ${value.length > 9 ? styles.longResult : ""}`}
          aria-live="polite"
          aria-label="Calculator display"
        >
          {value}
        </output>
      </div>
      {scientific && (
        <div className={styles.scientific} aria-label="Scientific functions">
          {scientificKeys.map((key) => (
            <button
              type="button"
              key={key}
              aria-label={names[key] ?? key.replace("(", "")}
              aria-pressed={key === "2nd" ? second : undefined}
              onClick={() => (key === "2nd" ? setSecond(!second) : press(key))}
            >
              {key === "angle"
                ? degrees
                  ? "Deg"
                  : "Rad"
                : key === "^"
                  ? "xʸ"
                  : key === "!"
                    ? "x!"
                    : key.replace("(", "")}
            </button>
          ))}
        </div>
      )}
      <div className={styles.keypad} aria-label="Calculator keypad">
        {basicKeys.map((key, index) => (
          <button
            type="button"
            key={key}
            className={`${styles.key} ${index < 3 ? styles.utility : ""} ${index % 4 === 3 ? styles.operator : ""}`}
            aria-label={names[key] ?? key}
            onClick={() => press(key)}
          >
            {key === "backspace" ? (
              <LuDelete aria-hidden="true" />
            ) : key === "±" ? (
              <svg
                viewBox="0 0 40 40"
                aria-hidden="true"
                className={styles.sign}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M8 8v12M2 14h12M29 7L11 33M26 28h12" />
              </svg>
            ) : (
              key
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
