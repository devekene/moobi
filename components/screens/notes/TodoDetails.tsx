"use client";
import { useState } from "react";
import {
  LuArchive,
  LuChevronLeft,
  LuPlus,
  LuPin,
  LuTrash2,
  LuCalendarDays,
  LuCircleCheck,
  LuX,
} from "react-icons/lu";
import type { Note, TodoItem } from "@/types";
import { localDateKey, taskDateLabel } from "@/lib/todos";
import { useNotesStore } from "@/stores/useNotesStore";
import { MenuAction, NotesMenu } from "./NotesMenu";
import styles from "./Todos.module.css";
export default function TodoDetails({ note }: { note: Note }) {
  const {
    updateNote,
    updateTask,
    deleteTask,
    startTaskEntry,
    selectNote,
    deleteNotes,
  } = useNotesStore();
  const [filter, setFilter] = useState<"all" | "open" | "completed">("all");
  const [status, setStatus] = useState("");
  const todos = note.todos ?? [];
  const completed = todos.filter((task) => task.completed).length;
  const today = localDateKey();
  const visible = todos.filter(
    (task) =>
      filter === "all" ||
      (filter === "completed" ? task.completed : !task.completed),
  );
  function taskRow(task: TodoItem) {
    const overdue = !task.completed && task.dueDate && task.dueDate < today;
    return (
      <article
        className={`${styles.task} ${task.completed ? styles.isComplete : ""}`}
        key={task.id}
      >
        <label className={styles.check}>
          <input
            type="checkbox"
            aria-label={`Complete ${task.text}`}
            checked={task.completed}
            onChange={() => {
              updateTask(note.id, task.id, { completed: !task.completed });
              setStatus(task.completed ? "Task reopened." : "Task completed.");
            }}
          />
          <span aria-hidden="true">{task.completed ? "✓" : ""}</span>
        </label>
        <div className={styles.taskBody}>
          <input
            className={styles.taskText}
            aria-label="Task text"
            value={task.text}
            onChange={(event) =>
              updateTask(note.id, task.id, { text: event.target.value })
            }
          />
          <div className={styles.taskMeta}>
            <label className={overdue ? styles.overdue : ""}>
              <LuCalendarDays />
              <span>
                {task.dueDate
                  ? `${overdue ? "Overdue · " : ""}${taskDateLabel(task.dueDate)}`
                  : "Set date"}
              </span>
              <input
                type="date"
                onClick={(event) => event.currentTarget.showPicker?.()}
                aria-label={`Due date for ${task.text}`}
                value={task.dueDate ?? ""}
                onChange={(event) =>
                  updateTask(note.id, task.id, { dueDate: event.target.value })
                }
              />
            </label>
            {task.dueDate && (
              <button
                className={styles.clearDate}
                aria-label={`Remove date for ${task.text}`}
                onClick={() => updateTask(note.id, task.id, { dueDate: "" })}
              >
                <LuX />
              </button>
            )}
            <select
              aria-label={`Priority for ${task.text}`}
              data-priority={task.priority}
              value={task.priority}
              onChange={(event) => {
                const priority = event.target.value;
                if (
                  priority === "low" ||
                  priority === "medium" ||
                  priority === "high"
                )
                  updateTask(note.id, task.id, { priority });
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <button
          className={styles.remove}
          aria-label={`Delete ${task.text}`}
          onClick={() => {
            deleteTask(note.id, task.id);
            setStatus("Task deleted.");
          }}
        >
          <LuTrash2 />
        </button>
      </article>
    );
  }
  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <button
          className={styles.iconButton}
          aria-label="Back to todos"
          onClick={() => selectNote(null)}
        >
          <LuChevronLeft />
        </button>
        <span>TASK LIST</span>
        <NotesMenu>
          <MenuAction
            onSelect={() => updateNote(note.id, { isPinned: !note.isPinned })}
          >
            <LuPin />
            {note.isPinned ? "Unpin List" : "Pin List"}
          </MenuAction>
          <MenuAction
            onSelect={() => {
              updateNote(note.id, { isArchived: !note.isArchived });
              selectNote(null);
            }}
          >
            <LuArchive />
            {note.isArchived ? "Unarchive List" : "Archive List"}
          </MenuAction>
          <MenuAction danger onSelect={() => deleteNotes([note.id])}>
            <LuTrash2 />
            Delete List
          </MenuAction>
        </NotesMenu>
      </header>
      <div className={styles.workspaceScroll}>
        <div className={styles.listSymbol}>
          <LuCircleCheck />
        </div>
        <input
          className={styles.workspaceTitle}
          aria-label="Todo list name"
          placeholder="Untitled list"
          value={note.title}
          onChange={(event) =>
            updateNote(note.id, { title: event.target.value })
          }
        />
        {note.content && (
          <details className={styles.legacy}>
            <summary>List notes</summary>
            <p>{note.content}</p>
          </details>
        )}
        <div className={styles.progressText}>
          <span>
            {completed === todos.length && todos.length
              ? "All done. Nicely done."
              : "A little progress, every day."}
          </span>
          <strong>
            {completed}/{todos.length}
          </strong>
        </div>
        <progress
          className={styles.progress}
          aria-label="Tasks completed"
          max={todos.length || 1}
          value={completed}
        />
        <div className={styles.filters} role="group" aria-label="Filter tasks">
          {(["all", "open", "completed"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "all"
                ? "All tasks"
                : value === "open"
                  ? "To do"
                  : "Done"}
            </button>
          ))}
        </div>
        <div className={styles.taskList}>
          {visible.filter((task) => !task.completed).map(taskRow)}
          {visible.some((task) => task.completed) && (
            <h2 className={styles.sectionLabel}>COMPLETED</h2>
          )}
          {visible.filter((task) => task.completed).map(taskRow)}
        </div>
        {!visible.length && (
          <p className={styles.empty}>
            {filter === "completed"
              ? "Your completed tasks will appear here."
              : filter === "open" && todos.length
                ? "You’re all caught up."
                : "Start with one thing you want to do."}
          </p>
        )}
      </div>
      <footer className={styles.bottom}>
        <button
          className={styles.primary}
          onClick={() => startTaskEntry(note.id)}
        >
          <LuPlus /> Add tasks
        </button>
        <p role="status">{status}</p>
      </footer>
    </div>
  );
}
