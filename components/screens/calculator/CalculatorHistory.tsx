import { useEffect, useRef, useState } from "react";
import { LuCheck, LuHistory, LuX } from "react-icons/lu";
import { useCalculatorStore } from "@/stores/useCalculatorStore";
import { formatCalculation, groupCalculations } from "@/lib/calculator";
import styles from "./calculator.module.css";

export default function CalculatorHistory({
  onClose,
}: {
  onClose: () => void;
}) {
  const { history, recall, remove } = useCalculatorStore();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.focus();
  }, []);
  return (
    <div
      className={styles.sheet}
      role="dialog"
      aria-modal="true"
      aria-label="Calculation history"
      ref={panel}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
        if (event.key === "Tab") {
          const buttons = panel.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          );
          const first = buttons?.[0],
            last = buttons?.[buttons.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === panel.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
              document.activeElement === panel.current)
          ) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className={styles.handle} aria-hidden="true" />
      <header className={styles.sheetToolbar}>
        <button
          type="button"
          className={styles.edit}
          disabled={!history.length}
          onClick={() => {
            setEditing(!editing);
            setSelected([]);
          }}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          type="button"
          className={styles.tool}
          aria-label="Close history"
          onClick={onClose}
        >
          <LuX />
        </button>
      </header>
      <div className={styles.historyList}>
        {!history.length ? (
          <div className={styles.empty}>
            <LuHistory aria-hidden="true" />
            <h2>No history yet</h2>
            <p>Your completed calculations will appear here.</p>
          </div>
        ) : (
          groupCalculations(history).map(({ label, entries }) => (
            <section key={label} aria-label={label}>
              <h2>{label}</h2>
              <ul>
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={styles.historyEntry}
                      aria-label={
                        editing
                          ? `Select ${entry.expression} equals ${entry.result}`
                          : `Use ${entry.expression} equals ${entry.result}`
                      }
                      aria-pressed={
                        editing ? selected.includes(entry.id) : undefined
                      }
                      onClick={() => {
                        if (editing)
                          setSelected((ids) =>
                            ids.includes(entry.id)
                              ? ids.filter((id) => id !== entry.id)
                              : [...ids, entry.id],
                          );
                        else {
                          recall(entry);
                          onClose();
                        }
                      }}
                    >
                      {editing && (
                        <span className={styles.selection} aria-hidden="true">
                          {selected.includes(entry.id) && <LuCheck />}
                        </span>
                      )}
                      <span>
                        <span className={styles.historyExpression}>
                          {formatCalculation(entry.expression)}
                        </span>
                        <span className={styles.historyResult}>
                          {formatCalculation(entry.result)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      {editing && (
        <footer className={styles.historyActions}>
          <button
            type="button"
            onClick={() =>
              setSelected(
                selected.length === history.length
                  ? []
                  : history.map((entry) => entry.id),
              )
            }
          >
            {selected.length === history.length ? "Deselect All" : "Select All"}
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => {
              remove(selected);
              setSelected([]);
              if (selected.length === history.length) setEditing(false);
            }}
          >
            Delete{selected.length ? ` (${selected.length})` : ""}
          </button>
        </footer>
      )}
    </div>
  );
}
