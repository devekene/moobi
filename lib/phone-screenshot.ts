export const getPhoneScreenshotFilename = (
  screen: string,
  date = new Date(),
) => {
  const safeScreen = screen.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `moobi-${safeScreen}-${timestamp}.png`;
};

export const downloadPhoneScreenshot = async (
  phoneElement: HTMLElement,
  screen: string,
  date = new Date(),
) => {
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(phoneElement, {
    cacheBust: true,
    pixelRatio: 2,
  });

  if (!blob) throw new Error("The phone screenshot could not be created.");

  const gallerySaved = await useGalleryStore
    .getState()
    .saveScreenshot(blob, screen, date);

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = getPhoneScreenshotFilename(screen, date);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return {
    filename: getPhoneScreenshotFilename(screen, date),
    gallerySaved,
  } satisfies PhoneScreenshotResult;
};

export const downloadPhoneDisplayScreenshot = async (
  phoneRoot: Pick<HTMLElement, "querySelector">,
  screen: string,
) => {
  // Capture the untransformed display content, excluding the 3D shell and stage.
  const display = phoneRoot.querySelector<HTMLElement>(
    '[data-phone-display="true"]',
  );
  if (!display) throw new Error("The phone display is not ready yet.");
  return downloadPhoneScreenshot(display, screen);
};
import { useGalleryStore } from "@/stores/useGalleryStore";

export interface PhoneScreenshotResult {
  filename: string;
  gallerySaved: boolean;
}
