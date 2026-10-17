"use client";
import { useRef, useState } from "react";
import {
  LuArchive,
  LuCheck,
  LuChevronLeft,
  LuDownload,
  LuGrid2X2,
  LuListTodo,
  LuPin,
  LuSearch,
  LuShare,
  LuSquarePen,
  LuTrash2,
  LuType,
  LuUndo2,
  LuX,
} from "react-icons/lu";
import type { Note } from "@/types";
import { useNotesStore } from "@/stores/useNotesStore";
import { MenuAction, NotesMenu } from "./NotesMenu";
import styles from "./Notes.module.css";
export default function NoteDetails({ note }: { note: Note }) {
  const { updateNote, selectNote, deleteNotes, createNote } = useNotesStore();
  const [original] = useState(note);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState("");
  const [lined, setLined] = useState(false);
  const [large, setLarge] = useState(false);
  const [status, setStatus] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  function find(text: string) {
    setQuery(text);
    const index = (note.content ?? "")
      .toLocaleLowerCase()
      .indexOf(text.toLocaleLowerCase());
    if (text && index >= 0)
      contentRef.current?.setSelectionRange(index, index + text.length);
  }
  const plainText = [
    note.title,
    note.content,
    ...(note.todos?.map(
      (todo) => `${todo.completed ? "[x]" : "[ ]"} ${todo.text}`,
    ) ?? []),
  ].join("\n");
  function download() {
    const url = URL.createObjectURL(
      new Blob([plainText], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title || "Untitled"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Note exported.");
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: note.title || "Untitled",
          text: plainText,
        });
      else {
        await navigator.clipboard.writeText(plainText);
        setStatus("Note copied to clipboard.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setStatus("Sharing is unavailable. Use Export text to save a copy.");
    }
  }
  return (
    <div className={styles.details}>
      <header className={styles.topbar}>
        <button
          className={styles.round}
          aria-label="Back to notes"
          onClick={() => selectNote(null)}
        >
          <LuChevronLeft />
        </button>
        <div className={styles.headerActions}>
          <button
            className={styles.round}
            aria-label="Revert edits since opening"
            disabled={
              note.title === original.title &&
              note.content === original.content &&
              JSON.stringify(note.todos) === JSON.stringify(original.todos)
            }
            onClick={() =>
              updateNote(note.id, {
                title: original.title,
                content: original.content,
                todos: original.todos,
              })
            }
          >
            <LuUndo2 />
          </button>
          <div className={styles.pill}>
            <button aria-label="Share note" onClick={() => void share()}>
              <LuShare />
            </button>
            <NotesMenu>
              <MenuAction
                onSelect={() =>
                  updateNote(note.id, { isPinned: !note.isPinned })
                }
              >
                <LuPin />
                {note.isPinned ? "Unpin Note" : "Pin Note"}
              </MenuAction>
              <MenuAction onSelect={() => setFinding(!finding)}>
                <LuSearch />
                Find in Note
              </MenuAction>
              <MenuAction
                onSelect={() => {
                  updateNote(note.id, { isArchived: !note.isArchived });
                  selectNote(null);
                }}
              >
                <LuArchive />
                {note.isArchived ? "Unarchive Note" : "Archive Note"}
              </MenuAction>
              <MenuAction onSelect={() => setLined(!lined)}>
                <LuGrid2X2 />
                {lined ? "Hide Lines" : "Show Lines"}
              </MenuAction>
              <MenuAction onSelect={download}>
                <LuDownload />
                Export Text
              </MenuAction>
              <MenuAction
                onSelect={() => {
                  deleteNotes([note.id]);
                }}
                danger
              >
                <LuTrash2 />
                Delete
              </MenuAction>
            </NotesMenu>
          </div>
        </div>
      </header>
      {finding && (
        <label className={styles.find}>
          <LuSearch />
          <input
            autoFocus
            aria-label="Find in note"
            placeholder="Find in Note"
            value={query}
            onChange={(event) => find(event.target.value)}
          />
          <span>
            {query
              ? `${[note.title, note.content, ...(note.todos?.map((todo) => todo.text) ?? [])].join("\n").toLocaleLowerCase().split(query.toLocaleLowerCase()).length - 1} matches`
              : ""}
          </span>
          <button aria-label="Close find" onClick={() => setFinding(false)}>
            <LuX />
          </button>
        </label>
      )}
      <div
        className={`${styles.editor} ${lined ? styles.lined : ""} ${large ? styles.large : ""}`}
      >
        <p className={styles.date}>
          {new Date(note.updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          at{" "}
          {new Date(note.updatedAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <input
          className={styles.titleInput}
          aria-label="Note title"
          placeholder={note.type === "todo" ? "Todo list" : "Title"}
          value={note.title}
          onChange={(event) =>
            updateNote(note.id, { title: event.target.value })
          }
        />
        <textarea
          ref={contentRef}
          className={styles.bodyInput}
          aria-label="Note content"
          placeholder="Start writing…"
          value={note.content ?? ""}
          onChange={(event) =>
            updateNote(note.id, { content: event.target.value })
          }
        />
      </div>
      <p className={styles.status} role="status">
        {status}
      </p>
      <footer className={styles.detailTools}>
        <div className={styles.pill}>
          <button
            aria-label={
              note.type === "todo" ? "Convert to note" : "Convert to checklist"
            }
            aria-pressed={note.type === "todo"}
            onClick={() =>
              updateNote(note.id, {
                type: note.type === "todo" ? "note" : "todo",
              })
            }
          >
            <LuListTodo />
          </button>
          <button aria-label="Export note as text" onClick={download}>
            <LuDownload />
          </button>
          <button
            aria-label="Larger text"
            aria-pressed={large}
            onClick={() => setLarge(!large)}
          >
            <LuType />
          </button>
          <button aria-label="Done editing" onClick={() => selectNote(null)}>
            <LuCheck />
          </button>
        </div>
        <button
          className={styles.round}
          aria-label="New note"
          onClick={() => createNote(note.type)}
        >
          <LuSquarePen />
        </button>
      </footer>
    </div>
  );
}
