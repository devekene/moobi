"use client";
import { LuArrowLeft, LuCalendarDays, LuPlus, LuTrash2 } from "react-icons/lu";
import { localDateKey, type TaskDraft, type TaskDraftRow } from "@/lib/todos";
import styles from "./Todos.module.css";
import { useNotesStore } from "@/stores/useNotesStore";
const blank = (): TaskDraftRow => ({
  key: crypto.randomUUID(),
  text: "",
  priority: "medium",
});
export default function TodoComposer({
  listTitle,
  onSave,
  onCancel,
}: {
  listTitle?: string;
  onSave: (title: string, tasks: TaskDraft[]) => void;
  onCancel: () => void;
}) {
  const {
    taskDraftTitle: title,
    setTaskDraftTitle: setTitle,
    taskDrafts: rows,
    setTaskDrafts,
  } = useNotesStore();
  function setRows(update: (current: TaskDraftRow[]) => TaskDraftRow[]) {
    setTaskDrafts(update(rows));
  }
  const count = rows.filter((row) => row.text.trim()).length;
  function change(key: string, patch: Partial<TaskDraft>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }
  function quickDate(key: string, offset: number) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    change(key, { dueDate: localDateKey(date) });
  }
  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault();
        if (count) onSave(title, rows);
      }}
    >
      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Cancel task entry"
          onClick={onCancel}
        >
          <LuArrowLeft />
        </button>
        <span>{listTitle === undefined ? "NEW LIST" : "ADD TASKS"}</span>
        <button className={styles.save} disabled={!count}>
          Save {count || ""}
        </button>
      </header>
      <div className={styles.composerScroll}>
        <h1>
          {listTitle === undefined
            ? "Make room for\nwhat matters."
            : "What’s next?"}
        </h1>
        <p className={styles.intro}>
          One task or a whole plan. Give each one its own date.
        </p>
        {listTitle === undefined ? (
          <label className={styles.listName}>
            LIST NAME
            <input
              aria-label="List name"
              placeholder="e.g. Launch week"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
        ) : (
          <p className={styles.context}>{listTitle || "Untitled list"}</p>
        )}
        <div className={styles.drafts}>
          {rows.map((row, index) => (
            <div className={styles.draft} key={row.key}>
              <div className={styles.draftTitle}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <input
                  autoFocus={index === rows.length - 1}
                  aria-label={`Task ${index + 1}`}
                  placeholder="What needs to happen?"
                  value={row.text}
                  onChange={(event) =>
                    change(row.key, { text: event.target.value })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setRows((current) => [...current, blank()]);
                    }
                  }}
                  onPaste={(event) => {
                    const lines = event.clipboardData
                      .getData("text")
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean);
                    if (lines.length < 2) return;
                    event.preventDefault();
                    setRows((current) =>
                      current.flatMap((item) =>
                        item.key === row.key
                          ? lines.map((text, lineIndex) => ({
                              ...row,
                              key:
                                lineIndex === 0 ? row.key : crypto.randomUUID(),
                              text,
                            }))
                          : [item],
                      ),
                    );
                  }}
                />
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove task ${index + 1}`}
                  disabled={rows.length === 1 && !row.text}
                  onClick={() =>
                    setRows((current) =>
                      current.length === 1
                        ? [blank()]
                        : current.filter((item) => item.key !== row.key),
                    )
                  }
                >
                  <LuTrash2 />
                </button>
              </div>
              <div className={styles.properties}>
                <label>
                  <LuCalendarDays />
                  <input
                    type="date"
                    aria-label={`Due date for task ${index + 1}`}
                    value={row.dueDate ?? ""}
                    onChange={(event) =>
                      change(row.key, {
                        dueDate: event.target.value || undefined,
                      })
                    }
                  />
                </label>
                <select
                  aria-label={`Priority for task ${index + 1}`}
                  value={row.priority}
                  onChange={(event) => {
                    const priority = event.target.value;
                    if (
                      priority === "low" ||
                      priority === "medium" ||
                      priority === "high"
                    )
                      change(row.key, { priority });
                  }}
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                </select>
              </div>
              <div className={styles.quickDates}>
                <button type="button" onClick={() => quickDate(row.key, 0)}>
                  Today
                </button>
                <button type="button" onClick={() => quickDate(row.key, 1)}>
                  Tomorrow
                </button>
                {row.dueDate && (
                  <button
                    type="button"
                    onClick={() => change(row.key, { dueDate: undefined })}
                  >
                    Clear date
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.addRow}
          onClick={() => setRows((current) => [...current, blank()])}
        >
          <LuPlus /> Add another task
        </button>
        <p className={styles.hint}>
          Press Enter for another task, or paste several lines to add them
          together.
        </p>
      </div>
    </form>
  );
}
