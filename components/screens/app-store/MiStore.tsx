"use client";

import { useMemo, useState } from "react";
import AppDetails from "@/components/screens/app-store/AppDetails";
import AppSearch from "@/components/screens/app-store/AppSearch";
import AppSections from "@/components/screens/app-store/AppSections";
import { Button } from "@/components/ui/button";
import {
  isMiniAppId,
  getMiniApp,
  MINI_APPS,
  searchMiniApps,
  type MiniAppCategory,
  type RegisteredMiniApp,
} from "@/lib/app-registry";
import { usePhoneStore } from "@/stores/usePhoneStore";

const categories: Array<MiniAppCategory | "all"> = [
  "all",
  ...Array.from(new Set(MINI_APPS.map((app) => app.category))),
];

const MiStore = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MiniAppCategory | "all">("all");
  const [selectedApp, setSelectedApp] = useState<RegisteredMiniApp | null>(null);
  const { history, setCurrentScreen } = usePhoneStore();

  const matchingApps = useMemo(
    () => searchMiniApps(query, category),
    [query, category],
  );
  const recentApps = useMemo(() => {
    const recentIds = [...history].reverse().filter(isMiniAppId);
    return recentIds
      .filter((id, index) => recentIds.indexOf(id) === index)
      .filter((id) => id !== "app-store")
      .map(getMiniApp);
  }, [history]);

  const openApp = (app: RegisteredMiniApp) => {
    setSelectedApp(null);
    setCurrentScreen(app.launchTarget.screen);
  };

  return (
    <main className="relative w-full bg-[var(--phone-canvas)] px-4 text-[var(--phone-text)]">
      {selectedApp ? (
        <AppDetails
          app={selectedApp}
          onBack={() => setSelectedApp(null)}
          onOpen={() => openApp(selectedApp)}
        />
      ) : (
        <div className="space-y-5 pb-6">
          <header>
            <h1 className="text-2xl font-bold">Mini apps</h1>
            <p className="mt-1 text-sm text-[var(--phone-text-muted)]">
              Discover bundled apps and preview them in the virtual phone.
            </p>
          </header>

          <AppSearch query={query} onQueryChange={setQuery} />

          <nav aria-label="Filter mini apps" className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                onClick={() => setCategory(option)}
                aria-pressed={category === option}
                className={`shrink-0 capitalize ${category === option ? "bg-[var(--phone-accent)] text-white" : "bg-[var(--phone-surface)] text-[var(--phone-text-secondary)] hover:bg-[var(--phone-surface-elevated)]"}`}
              >
                {option === "all" ? "All apps" : option}
              </Button>
            ))}
          </nav>

          {query.trim() || category !== "all" ? (
            <AppSections
              title={`Results (${matchingApps.length})`}
              apps={matchingApps}
              onSelect={setSelectedApp}
            />
          ) : (
            <>
              <AppSections
                title="Recently opened"
                apps={recentApps}
                onSelect={setSelectedApp}
              />
              <AppSections
                title="All mini apps"
                apps={MINI_APPS}
                onSelect={setSelectedApp}
              />
            </>
          )}

        </div>
      )}
    </main>
  );
};

export default MiStore;
