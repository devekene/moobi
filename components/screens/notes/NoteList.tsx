"use client";
import { useState } from "react";
import {
  LuArchive,
  LuArrowDownUp,
  LuCalendarDays,
  LuCheck,
  LuCircleCheck,
  LuGrid2X2,
  LuList,
  LuPin,
  LuSearch,
  LuSquarePen,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import type { NoteType } from "@/types";
import {
  groupNotes,
  notePreview,
  visibleNotes,
  type NotesSort,
} from "@/lib/notes";
import { taskDateLabel } from "@/lib/todos";
import { useNotesStore } from "@/stores/useNotesStore";
import { MenuAction, NotesMenu } from "./NotesMenu";
import styles from "./Notes.module.css";
export default function NoteList({ type }: { type: NoteType }) {
  const { notes, createNote, selectNote, deleteNotes, startTaskEntry } =
    useNotesStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<NotesSort>("edited");
  const [grouped, setGrouped] = useState(true);
  const [gallery, setGallery] = useState(false);
  const [archived, setArchived] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const filtered = visibleNotes(notes, type, query, archived, sort);
  const groups = groupNotes(filtered, grouped, new Date(), sort);
  const title = archived ? "Archived" : type === "note" ? "Notes" : "Todos";
  function finishSelection() {
    setSelection([]);
    setSelecting(false);
  }
  return (
    <div className={styles.list}>
      <header className={styles.topbar}>
        <h1>{selecting ? `${selection.length} Selected` : title}</h1>
        {selecting ? (
          <button className={styles.textButton} onClick={finishSelection}>
            Done
          </button>
        ) : (
          <NotesMenu>
            <MenuAction onSelect={() => setGallery(!gallery)}>
              {gallery ? <LuList /> : <LuGrid2X2 />}
              {gallery ? "View as List" : "View as Gallery"}
            </MenuAction>
            <MenuAction onSelect={() => setSelecting(true)}>
              <LuCircleCheck />
              Select {type === "note" ? "Notes" : "Todos"}
            </MenuAction>
            <MenuAction
              onSelect={() =>
                setSort(
                  sort === "edited"
                    ? "created"
                    : sort === "created"
                      ? "title"
                      : "edited",
                )
              }
            >
              <LuArrowDownUp />
              <span>
                Sort By
                <small>
                  {sort === "edited"
                    ? "Date Edited"
                    : sort === "created"
                      ? "Date Created"
                      : "Title"}
                </small>
              </span>
            </MenuAction>
            <MenuAction onSelect={() => setGrouped(!grouped)}>
              <LuCalendarDays />
              <span>
                Group By Date<small>{grouped ? "On" : "Off"}</small>
              </span>
            </MenuAction>
            <MenuAction onSelect={() => setArchived(!archived)}>
              <LuArchive />
              {archived ? "View Active" : "View Archived"}
            </MenuAction>
          </NotesMenu>
        )}
      </header>
      <div className={styles.listScroll}>
        {groups.map((group) => (
          <section key={group.label} className={styles.group}>
            <h2>{group.label}</h2>
            <div className={gallery ? styles.gallery : styles.cards}>
              {group.notes.map((note) => (
                <button
                  key={note.id}
                  className={styles.card}
                  onClick={() =>
                    selecting
                      ? setSelection((ids) =>
                          ids.includes(note.id)
                            ? ids.filter((id) => id !== note.id)
                            : [...ids, note.id],
                        )
                      : selectNote(note.id)
                  }
                  aria-pressed={
                    selecting ? selection.includes(note.id) : undefined
                  }
                >
                  {selecting && (
                    <span className={styles.selection}>
                      {selection.includes(note.id) ? (
                        <LuCircleCheck />
                      ) : (
                        <span className={styles.unchecked} />
                      )}
                    </span>
                  )}
                  <span className={styles.cardText}>
                    <strong>
                      {note.isPinned && <LuPin />}
                      {note.title || "Untitled"}
                    </strong>
                    <span>
                      <time>
                        {new Date(note.updatedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </time>{" "}
                      {notePreview(note)}
                    </span>
                    {type === "todo" && (
                      <span className={styles.taskPreview}>
                        {(note.todos ?? [])
                          .filter((task) => !task.completed)
                          .slice(0, 2)
                          .map((task) => (
                            <span key={task.id}>
                              ○ {task.text}
                              {task.dueDate
                                ? ` · ${taskDateLabel(task.dueDate)}`
                                : ""}
                            </span>
                          ))}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <LuList />
            <h2>{query ? "No results" : `No ${title.toLowerCase()} yet`}</h2>
            <p>
              {query
                ? "Try another title, phrase, or task."
                : `Tap compose to create ${type === "note" ? "a note" : "a todo list"}.`}
            </p>
          </div>
        )}
      </div>
      <div className={styles.listTools}>
        {selecting ? (
          <>
            <button
              className={styles.textButton}
              onClick={() => setSelection(filtered.map((note) => note.id))}
            >
              <LuCheck /> Select All
            </button>
            <button
              className={styles.round}
              aria-label="Delete selected notes"
              disabled={!selection.length}
              onClick={() => {
                deleteNotes(selection);
                finishSelection();
              }}
            >
              <LuTrash2 />
            </button>
          </>
        ) : (
          <>
            <label className={styles.search}>
              <LuSearch />
              <input
                aria-label={`Search ${title.toLowerCase()}`}
                placeholder="Search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <LuX />
                </button>
              )}
            </label>
            <button
              className={styles.round}
              aria-label={type === "note" ? "New note" : "New todo list"}
              onClick={() =>
                type === "todo" ? startTaskEntry() : createNote(type)
              }
            >
              <LuSquarePen />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
