"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCheck,
  FiEdit3,
  FiFileText,
  FiMail,
  FiSearch,
  FiSend,
  FiStar,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  mailConfigured,
  searchMail,
  validateMail,
  type MailErrors,
  type MailFields,
  type MailMessage,
} from "@/lib/mail";
import { useMailStore } from "@/stores/useMailStore";
import styles from "./mail.module.css";

function dateLabel(value: string, full = false) {
  return new Intl.DateTimeFormat(
    undefined,
    full
      ? { dateStyle: "medium", timeStyle: "short" }
      : { month: "short", day: "numeric" },
  ).format(new Date(value));
}

export default function MailCompose() {
  const {
    messages,
    sendingId,
    createDraft,
    updateDraft,
    remove,
    toggleStar,
    send,
  } = useMailStore();
  const [folder, setFolder] = useState<MailMessage["folder"]>("sent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [starred, setStarred] = useState(false);
  const [errors, setErrors] = useState<MailErrors>({});
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const composeButton = useRef<HTMLButtonElement>(null);
  const recipientInput = useRef<HTMLInputElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(false);
  const selected = messages.find((message) => message.id === selectedId);
  const composing = selected?.folder === "drafts";
  const sending = sendingId === selectedId && selectedId !== null;
  const visible = searchMail(messages, folder, query, starred);

  useEffect(() => {
    if (selectedId) {
      if (composing) recipientInput.current?.focus();
      else detailHeading.current?.focus();
    } else if (wasOpen.current) composeButton.current?.focus();
    wasOpen.current = selectedId !== null;
  }, [selectedId, composing]);

  function open(id: string) {
    setErrors({});
    setFailure("");
    setNotice("");
    setConfirmDelete(false);
    setSelectedId(id);
  }
  function close() {
    if (sending) return;
    if (selected?.folder === "drafts") {
      if (
        ![selected.to, selected.subject, selected.body].some((value) =>
          value.trim(),
        )
      )
        remove(selected.id);
      else setNotice("Draft saved on this browser.");
    }
    setSelectedId(null);
    setConfirmDelete(false);
    setFailure("");
  }
  function update(field: keyof MailFields, value: string) {
    if (!selected) return;
    updateDraft(selected.id, { [field]: value });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFailure("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || sending) return;
    const nextErrors = validateMail(selected);
    setErrors(nextErrors);
    setFailure("");
    if (Object.keys(nextErrors).length) {
      const field = event.currentTarget.elements.namedItem(
        Object.keys(nextErrors)[0],
      );
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    try {
      await send(selected.id);
      setFolder("sent");
      setQuery("");
      setStarred(false);
      setSelectedId(null);
      setNotice("Message accepted by the mail service. Saved to Sent.");
    } catch {
      setFailure(
        mailConfigured
          ? "We couldn’t confirm the send. Your draft is safe. Check with your recipient before trying again."
          : "Sending isn’t configured for this preview. You can keep writing; your draft is saved on this browser.",
      );
    }
  }

  return (
    <section
      className={styles.app}
      aria-label="Mail"
      onKeyDown={(event) => {
        if (event.key === "Escape" && selected) {
          event.stopPropagation();
          if (confirmDelete) setConfirmDelete(false);
          else close();
        }
      }}
    >
      <div className={styles.live} role="status">
        {notice}
      </div>
      {selected ? (
        <>
          <header className={styles.navigation}>
            <button
              className={styles.textButton}
              onClick={close}
              disabled={sending}
            >
              <FiArrowLeft /> {composing ? "Save & close" : "Mail"}
            </button>
            <span className={styles.eyebrow}>
              {composing ? "NEW MESSAGE" : "SENT MESSAGE"}
            </span>
          </header>
          {composing ? (
            <form
              className={styles.editor}
              onSubmit={submit}
              noValidate
              aria-label="Compose email"
              aria-busy={sending}
            >
              <div className={styles.composeTitle}>
                <h1>Let’s talk.</h1>
                <p>A little note can go a long way.</p>
              </div>
              <fieldset disabled={sending} className={styles.fields}>
                {(["to", "from", "subject"] as const).map((field) => (
                  <div className={styles.field} key={field}>
                    <label htmlFor={`mail-${field}`}>
                      {field === "to"
                        ? "To"
                        : field === "from"
                          ? "From"
                          : "Subject"}
                    </label>
                    <div>
                      <input
                        ref={field === "to" ? recipientInput : undefined}
                        id={`mail-${field}`}
                        name={field}
                        type={field === "subject" ? "text" : "email"}
                        autoComplete={field === "from" ? "email" : "off"}
                        maxLength={field === "subject" ? 200 : 254}
                        value={selected[field]}
                        onChange={(event) => update(field, event.target.value)}
                        placeholder={
                          field === "subject"
                            ? "Give your note a title"
                            : field === "to"
                              ? "someone@example.com"
                              : "your@email.com"
                        }
                        aria-invalid={Boolean(errors[field])}
                        aria-describedby={
                          errors[field] ? `mail-${field}-error` : undefined
                        }
                      />
                      {errors[field] && (
                        <p className={styles.error} id={`mail-${field}-error`}>
                          {errors[field]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <label className={styles.live} htmlFor="mail-body">
                  Message
                </label>
                <textarea
                  id="mail-body"
                  name="body"
                  value={selected.body}
                  maxLength={20000}
                  onChange={(event) => update("body", event.target.value)}
                  placeholder="What’s on your mind?"
                  aria-invalid={Boolean(errors.body)}
                  aria-describedby={errors.body ? "mail-body-error" : undefined}
                />
                {errors.body && (
                  <p id="mail-body-error" className={styles.error}>
                    {errors.body}
                  </p>
                )}
              </fieldset>
              <div className={styles.sendArea}>
                {!mailConfigured && (
                  <p className={styles.info}>
                    <FiMail /> Drafts work here. Sending needs EmailJS setup.
                  </p>
                )}
                {failure && (
                  <p className={styles.error} role="alert">
                    {failure}
                  </p>
                )}
                <div className={styles.sendActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Discard draft"
                    disabled={sending}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <FiTrash2 />
                  </button>
                  <span className={styles.saved}>
                    <FiCheck /> Auto-saved
                  </span>
                  <button
                    className={styles.primary}
                    type="submit"
                    disabled={sending || !mailConfigured}
                  >
                    {sending ? "Sending…" : "Send message"}
                    <FiArrowUpRight />
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className={styles.detail}>
              <div className={styles.detailMeta}>
                <span className={styles.badge}>
                  <FiCheck /> Sent
                </span>
                <time dateTime={selected.updatedAt}>
                  {dateLabel(selected.updatedAt, true)}
                </time>
              </div>
              <h1 ref={detailHeading} tabIndex={-1}>
                {selected.subject || "(No subject)"}
              </h1>
              <div className={styles.addresses}>
                <span className={styles.avatar}>
                  {selected.to.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>To {selected.to}</strong>
                  <p>From {selected.from}</p>
                </div>
              </div>
              <p className={styles.messageBody}>{selected.body}</p>
              <p className={styles.deliveryNote}>
                Accepted by the mail service. Delivery and replies are not
                tracked here.
              </p>
              <div className={styles.detailActions}>
                <button
                  className={styles.textButton}
                  onClick={() =>
                    open(
                      createDraft({
                        from: selected.from,
                        subject: `Fwd: ${selected.subject}`,
                        body: `\n\n—— Forwarded message ——\nFrom: ${selected.from}\nTo: ${selected.to}\nSubject: ${selected.subject}\n\n${selected.body}`,
                      }),
                    )
                  }
                >
                  <FiArrowUpRight /> Forward
                </button>
                <button
                  className={styles.iconButton}
                  aria-label={
                    selected.starred ? "Unstar message" : "Star message"
                  }
                  aria-pressed={selected.starred}
                  onClick={() => toggleStar(selected.id)}
                >
                  <FiStar fill={selected.starred ? "currentColor" : "none"} />
                </button>
                <button
                  className={styles.iconButton}
                  aria-label="Delete sent copy"
                  onClick={() => setConfirmDelete(true)}
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          )}
          <Dialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
            <Dialog.Content
              className={styles.confirm}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                if (composing) recipientInput.current?.focus();
                else detailHeading.current?.focus();
              }}
            >
              <Dialog.Title asChild>
                <strong>
                  {composing
                    ? "Discard this draft?"
                    : "Delete this saved copy?"}
                </strong>
              </Dialog.Title>
              <Dialog.Description>
                {composing
                  ? "This removes the draft from this browser."
                  : "This won’t recall the email."}
              </Dialog.Description>
              <div>
                <button
                  className={styles.textButton}
                  autoFocus
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep it
                </button>
                <button
                  className={styles.dangerButton}
                  onClick={() => {
                    remove(selected.id);
                    setSelectedId(null);
                    setConfirmDelete(false);
                    setNotice(
                      composing ? "Draft discarded." : "Saved copy deleted.",
                    );
                  }}
                >
                  Delete
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Root>
        </>
      ) : (
        <>
          <header className={styles.header}>
            <div className={styles.brand}>
              <span className={styles.brandIcon}>
                <FiMail />
              </span>
              <span>MAIL</span>
              <span className={styles.localBadge}>Personal</span>
            </div>
            <div className={styles.titleRow}>
              <button
                ref={composeButton}
                className={styles.composeButton}
                aria-label="Compose new message"
                onClick={() => open(createDraft())}
              >
                <FiEdit3 />
              </button>
            </div>
          </header>
          <div
            className={styles.mailboxBar}
            role="group"
            aria-label="Mail folders"
          >
            {(["sent", "drafts"] as const).map((item) => (
              <button
                key={item}
                aria-pressed={folder === item}
                className={folder === item ? styles.activeTab : styles.tab}
                onClick={() => {
                  setFolder(item);
                  setNotice("");
                }}
              >
                {item === "sent" ? <FiSend /> : <FiFileText />}
                {item === "sent" ? "Sent" : "Drafts"}
                <span>
                  {messages.filter((message) => message.folder === item).length}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.searchRow}>
            <label className={styles.search}>
              <FiSearch />
              <input
                aria-label="Search mail"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your mail"
              />
              {query && (
                <button
                  className={styles.clearSearch}
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <FiX />
                </button>
              )}
            </label>
            <button
              className={styles.iconButton}
              aria-label="Show starred only"
              aria-pressed={starred}
              onClick={() => setStarred((value) => !value)}
            >
              <FiStar fill={starred ? "currentColor" : "none"} />
            </button>
          </div>
          {notice && <p className={styles.notice}>{notice}</p>}
          <div className={styles.listHeader}>
            <span>
              {starred
                ? "STARRED"
                : folder === "sent"
                  ? "YOUR OUTGOING MAIL"
                  : "PICK UP WHERE YOU LEFT OFF"}
            </span>
            <span>
              {visible.length} {visible.length === 1 ? "message" : "messages"}
            </span>
          </div>
          <div className={styles.list}>
            {visible.length ? (
              visible.map((message) => (
                <article key={message.id} className={styles.messageRow}>
                  <button
                    className={styles.messageLink}
                    onClick={() => open(message.id)}
                  >
                    <span className={styles.avatar}>
                      {(message.to || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className={styles.messageSummary}>
                      <span className={styles.messageTop}>
                        <strong>{message.to || "No recipient yet"}</strong>
                        <time dateTime={message.updatedAt}>
                          {dateLabel(message.updatedAt)}
                        </time>
                      </span>
                      <span className={styles.subject}>
                        {message.subject || "(No subject)"}
                      </span>
                      <span className={styles.preview}>
                        {message.body || "Your next great message starts here…"}
                      </span>
                    </span>
                  </button>
                  <button
                    className={styles.rowStar}
                    aria-label={`${message.starred ? "Unstar" : "Star"} ${message.subject || "message"}`}
                    aria-pressed={message.starred}
                    onClick={() => toggleStar(message.id)}
                  >
                    <FiStar fill={message.starred ? "currentColor" : "none"} />
                  </button>
                </article>
              ))
            ) : (
              <div className={styles.empty}>
                <div className={styles.emptyArt}>
                  {query || starred ? (
                    <FiSearch />
                  ) : folder === "sent" ? (
                    <FiSend />
                  ) : (
                    <FiFileText />
                  )}
                </div>
                <span className={styles.eyebrow}>
                  {query || starred ? "A FRESH LOOK" : "ROOM FOR CONNECTION"}
                </span>
                <h2>
                  {query || starred
                    ? "No matches just yet."
                    : folder === "sent"
                      ? "Good things start\nwith a hello."
                      : "Ideas worth keeping."}
                </h2>
                <p>
                  {query || starred
                    ? "Try another search or turn off the star filter."
                    : folder === "sent"
                      ? "Your sent messages will live here.\nMake someone’s day with a note."
                      : "Start a message and come back anytime.\nYour drafts are saved as you write."}
                </p>
                {query || starred ? (
                  <button
                    className={styles.textButton}
                    onClick={() => {
                      setQuery("");
                      setStarred(false);
                    }}
                  >
                    Clear filters <FiArrowUpRight />
                  </button>
                ) : (
                  <button
                    className={styles.primary}
                    onClick={() => open(createDraft())}
                  >
                    Write a message <FiArrowUpRight />
                  </button>
                )}
              </div>
            )}
          </div>
          <footer className={styles.footer}>
            <span className={styles.dot} /> Saved on this browser{" "}
            <span>Made for connection.</span>
          </footer>
        </>
      )}
    </section>
  );
}
