import type { MiniAppId } from "@/lib/app-registry";

export const DOCK_APP_IDS: MiniAppId[] = [
  "phone-dialer",
  "chrome-browser",
  "mail-composer",
  // "music-player",
];

export const reconcileHomeAppOrder = (
  registeredIds: readonly MiniAppId[],
  savedIds: readonly string[],
): MiniAppId[] => {
  const isRegistered = (id: string): id is MiniAppId =>
    registeredIds.some((registeredId) => registeredId === id);
  const saved = savedIds.filter(isRegistered);
  return [
    ...new Set(saved),
    ...registeredIds.filter((id) => !saved.includes(id)),
  ];
};

export const moveHomeApp = (
  appIds: readonly MiniAppId[],
  draggedId: MiniAppId,
  targetId: MiniAppId,
): MiniAppId[] => {
  const fromIndex = appIds.indexOf(draggedId);
  const targetIndex = appIds.indexOf(targetId);
  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) {
    return [...appIds];
  }
  const next = [...appIds];
  next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, draggedId);
  return next;
};
