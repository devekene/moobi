type ScrollViewport = Pick<
  HTMLElement,
  "scrollTop" | "scrollHeight" | "clientHeight"
>;
type WheelGesture = Pick<
  WheelEvent,
  "deltaX" | "deltaY" | "deltaMode" | "ctrlKey"
>;

/** Own wheel movement within the virtual display, including at scroll boundaries. */
export function scrollSheet(
  body: ScrollViewport,
  gesture: WheelGesture,
  textarea?: ScrollViewport | null,
): boolean {
  if (
    gesture.ctrlKey ||
    !gesture.deltaY ||
    Math.abs(gesture.deltaX) > Math.abs(gesture.deltaY)
  )
    return false;
  const canScrollText =
    textarea &&
    textarea.scrollHeight > textarea.clientHeight &&
    (gesture.deltaY > 0
      ? textarea.scrollTop + textarea.clientHeight < textarea.scrollHeight
      : textarea.scrollTop > 0);
  const target = canScrollText ? textarea : body;
  // WheelEvent deltaMode: 0 = pixels, 1 = lines, 2 = pages.
  const unit =
    gesture.deltaMode === 1
      ? 16
      : gesture.deltaMode === 2
        ? target.clientHeight
        : 1;
  target.scrollTop = Math.max(
    0,
    Math.min(
      target.scrollHeight - target.clientHeight,
      target.scrollTop + gesture.deltaY * unit,
    ),
  );
  return true;
}
