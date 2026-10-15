"use client";

import { Button } from "@/components/ui/button";
import type { RegisteredMiniApp } from "@/lib/app-registry";
import Image from "next/image";

const AppDetails = ({
  app,
  onBack,
  onOpen,
}: {
  app: RegisteredMiniApp;
  onBack: () => void;
  onOpen: () => void;
}) => {
  const Icon = app.icon;

  return (
    <article className="space-y-5 pb-8 text-[var(--phone-text)]">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="px-2 text-[var(--phone-text-secondary)]"
        aria-label="Back to mini apps"
      >
        ← All mini apps
      </Button>

      <header className="flex items-center gap-4">
        <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${app.color}`}>
          <Icon aria-hidden="true" className="h-9 w-9" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{app.name}</h1>
          <p className="text-sm capitalize text-[var(--phone-text-muted)]">
            {app.category} · Version {app.version}
          </p>
        </div>
      </header>

      <p className="text-sm leading-6 text-[var(--phone-text-secondary)]">
        {app.description}
      </p>

      {app.previewCapabilities.screenshotUrls?.length ? (
        <div className="flex gap-3 overflow-x-auto">
          {app.previewCapabilities.screenshotUrls.map((url) => (
            <Image
              key={url}
              src={url}
              alt={`${app.name} preview`}
              width={224}
              height={320}
              className="h-40 w-28 rounded-xl object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="rounded-xl bg-[var(--phone-surface)] p-4">
        <h2 className="font-semibold">Preview details</h2>
        <p className="mt-2 text-sm text-[var(--phone-text-secondary)]">
          {app.availability === "available"
            ? "This bundled mini app is available in the virtual phone."
            : "This entry opens an explanatory placeholder. It does not access device hardware or personal files."}
        </p>
      </div>

      <Button
        type="button"
        onClick={onOpen}
        className="w-full bg-[var(--phone-accent)] text-white hover:opacity-90"
      >
        {app.availability === "available" ? "Open app" : "Open preview"}
      </Button>
    </article>
  );
};

export default AppDetails;
