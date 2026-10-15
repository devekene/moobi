export type LockScreenTimePresentation = {
  scale: number;
  holdOffset: number;
};

export const getLockScreenTimePresentation = (
  scrollTop: number,
  hasScrollableNotifications: boolean,
): LockScreenTimePresentation => {
  if (!hasScrollableNotifications) return { scale: 1, holdOffset: 0 };

  const scrollDistance = Math.max(0, scrollTop);
  return {
    scale: Math.max(0.66, 1 - scrollDistance / 360),
    holdOffset: Math.min(scrollDistance, 120),
  };
};
