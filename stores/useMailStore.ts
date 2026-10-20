import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { encryptedStorage } from "@/lib/encrypted-storage";
import {
  isMailMessage,
  sendMail,
  validateMail,
  type MailFields,
  type MailMessage,
} from "@/lib/mail";

type MailState = {
  messages: MailMessage[];
  sender: string;
  sendingId: string | null;
  createDraft: (fields?: Partial<MailFields>) => string;
  updateDraft: (id: string, fields: Partial<MailFields>) => void;
  remove: (id: string) => void;
  toggleStar: (id: string) => void;
  send: (id: string) => Promise<void>;
};
export const createMailStore = (storage: StateStorage, transport = sendMail) =>
  create<MailState>()(
    persist(
      (set, get) => ({
        messages: [],
        sender: "",
        sendingId: null,
        createDraft: (fields = {}) => {
          const id = crypto.randomUUID();
          set((state) => ({
            messages: [
              {
                id,
                folder: "drafts",
                from: state.sender,
                to: "",
                subject: "",
                body: "",
                ...fields,
                starred: false,
                updatedAt: new Date().toISOString(),
              },
              ...state.messages,
            ],
          }));
          return id;
        },
        updateDraft: (id, fields) =>
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === id &&
              message.folder === "drafts" &&
              state.sendingId !== id
                ? { ...message, ...fields, updatedAt: new Date().toISOString() }
                : message,
            ),
          })),
        remove: (id) =>
          set((state) => ({
            messages: state.messages.filter(
              (message) => message.id !== id || state.sendingId === id,
            ),
          })),
        toggleStar: (id) =>
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === id
                ? { ...message, starred: !message.starred }
                : message,
            ),
          })),
        send: async (id) => {
          if (get().sendingId)
            throw new Error("A message is already being sent.");
          const message = get().messages.find(
            (item) => item.id === id && item.folder === "drafts",
          );
          if (!message) throw new Error("This draft is no longer available.");
          if (Object.keys(validateMail(message)).length)
            throw new Error("Check the recipient, sender, and message.");
          set({ sendingId: id });
          try {
            await transport(message);
            set((state) => ({
              sender: message.from.trim(),
              messages: state.messages.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      folder: "sent",
                      updatedAt: new Date().toISOString(),
                    }
                  : item,
              ),
            }));
          } finally {
            set({ sendingId: null });
          }
        },
      }),
      {
        name: "moobi-mail",
        storage: createJSONStorage(() => storage),
        skipHydration: storage === encryptedStorage,
        partialize: ({ messages, sender }) => ({ messages, sender }),
        merge: (saved, current) => {
          if (!saved || typeof saved !== "object") return current;
          return {
            ...current,
            messages:
              "messages" in saved && Array.isArray(saved.messages)
                ? saved.messages.filter(isMailMessage)
                : [],
            sender:
              "sender" in saved && typeof saved.sender === "string"
                ? saved.sender
                : "",
          };
        },
      },
    ),
  );
export const useMailStore = createMailStore(encryptedStorage);
