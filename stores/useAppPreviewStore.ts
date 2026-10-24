import { create } from "zustand";
import type { PhoneAppId } from "@/lib/phone-apps";

// Session-only, bounded images. Recents must never persist screenshots of app content.
export const createAppPreviewStore = (
  urls: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL,
) =>
  create<{
    previews: Partial<Record<PhoneAppId, string>>;
    save: (app: PhoneAppId, image: Blob) => void;
    retain: (apps: readonly string[]) => void;
  }>((set, get) => ({
    previews: {},
    save: (app, image) => {
      const previews = { ...get().previews };
      const previous = previews[app];
      if (previous) urls.revokeObjectURL(previous);
      delete previews[app];
      previews[app] = urls.createObjectURL(image);
      const entries = Object.entries(previews);
      if (entries.length > 8) {
        const oldest = entries[0];
        if (oldest) {
          if (oldest[1]) urls.revokeObjectURL(oldest[1]);
          set({ previews: Object.fromEntries(entries.slice(1)) });
          return;
        }
      }
      set({ previews });
    },
    retain: (apps) => {
      const entries = Object.entries(get().previews);
      const removed = entries.filter(([app]) => !apps.includes(app));
      if (!removed.length) return;
      removed.forEach(([, url]) => {
        if (url) urls.revokeObjectURL(url);
      });
      set({
        previews: Object.fromEntries(
          entries.filter(([app]) => apps.includes(app)),
        ),
      });
    },
  }));

export const useAppPreviewStore = createAppPreviewStore();
