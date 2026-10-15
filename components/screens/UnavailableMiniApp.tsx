"use client";

import { usePhoneStore } from "@/stores/usePhoneStore";
import { getMiniApp, isMiniAppId } from "@/lib/app-registry";

const UnavailableMiniApp = () => {
  const currentScreen = usePhoneStore((state) => state.currentScreen);
  const app = isMiniAppId(currentScreen)
    ? getMiniApp(currentScreen)
    : undefined;

  return (
    <main className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-[var(--phone-text)]">
      <span className="rounded-full bg-[var(--phone-surface-elevated)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--phone-text-secondary)]">
        Preview only
      </span>
      <h1 className="text-2xl font-semibold">{app?.name ?? "App preview"}</h1>
      <p className="max-w-xs text-sm text-[var(--phone-text-secondary)]">
        {app?.description ?? "This mini app is not available in this preview."}
      </p>
      <p className="max-w-xs text-xs text-[var(--phone-text-muted)]">
        This preview does not access your device hardware or files.
      </p>
    </main>
  );
};

export default UnavailableMiniApp;
