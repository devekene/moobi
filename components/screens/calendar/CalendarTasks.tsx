"use client";
import { LuArrowUpRight } from "react-icons/lu";
import { scheduledTasks } from "@/lib/todos";
import { useNotesStore } from "@/stores/useNotesStore";
import { usePhoneStore } from "@/stores/usePhoneStore";
import styles from "./CalendarTasks.module.css";
export default function CalendarTasks({ date }: { date: string }) {
  const { notes, updateTask, selectNote, setTab } = useNotesStore();
  const tasks = scheduledTasks(notes, date);
  if (!tasks.length) return null;
  return (
    <section className={styles.section} aria-label="Scheduled todos">
      <h2>
        Todos <span>{tasks.length}</span>
      </h2>
      {tasks.map((task) => (
        <div className={styles.task} key={`${task.listId}:${task.id}`}>
          <input
            type="checkbox"
            aria-label={`Complete ${task.text}`}
            checked={task.completed}
            onChange={() =>
              updateTask(task.listId, task.id, { completed: !task.completed })
            }
          />
          <button
            onClick={() => {
              setTab("todo");
              selectNote(task.listId);
              usePhoneStore.getState().setCurrentScreen("notes");
            }}
            aria-label={`Open ${task.text} in ${task.listTitle}`}
          >
            <span className={task.completed ? styles.completed : ""}>
              {task.text}
            </span>
            <small>
              {task.listTitle} · {task.priority} priority
            </small>
          </button>
          <LuArrowUpRight aria-hidden="true" />
        </div>
      ))}
    </section>
  );
}
