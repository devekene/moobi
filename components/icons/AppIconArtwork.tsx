import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";
import type { AppIconPresentation } from "@/lib/app-registry";

interface AppIconArtworkProps {
  icon: IconType;
  color: string;
  presentation?: AppIconPresentation;
  className?: string;
}

/** Applies the registry's icon sizing contract consistently on every launcher surface. */
export default function AppIconArtwork({
  icon: Icon,
  color,
  presentation = "contained",
  className,
}: AppIconArtworkProps) {
  return (
    <span
      data-icon-presentation={presentation}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        color,
        presentation === "full-bleed" &&
          "[&>svg]:h-full [&>svg]:w-full [&>svg]:max-w-none",
        className,
      )}
      style={{ borderRadius: "inherit" }}
    >
      <Icon aria-hidden="true" />
    </span>
  );
}
