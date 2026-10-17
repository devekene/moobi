import { create } from "zustand";
import type { MiniAppId } from "@/lib/app-registry";

// Session-only, bounded images. Recents must never persist screenshots of app content.
export const createAppPreviewStore = (
  urls: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL,
) =>
  create<{
    previews: Partial<Record<MiniAppId, string>>;
    save: (app: MiniAppId, image: Blob) => void;
    retain: (apps: readonly string[]) => void;
  }>((set, get) => ({
    previews: {},
    save: (app, image) => {
      const previews = { ...get().previews };
      if (previews[app]) urls.revokeObjectURL(previews[app]);
      delete previews[app];
      previews[app] = urls.createObjectURL(image);
      const entries = Object.entries(previews);
      if (entries.length > 8) {
        const oldest = entries[0];
        if (oldest) {
          urls.revokeObjectURL(oldest[1]);
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
      removed.forEach(([, url]) => urls.revokeObjectURL(url));
      set({
        previews: Object.fromEntries(
          entries.filter(([app]) => apps.includes(app)),
        ),
      });
    },
  }));

export const useAppPreviewStore = createAppPreviewStore();
