import Image from "next/image";
import { useSwipeable } from "react-swipeable";
import type { MediaItem } from "@/types";
import styles from "./gallery.module.css";

export default function ImageView({
  media,
  goToNextMedia,
  goToPreviousMedia,
}: {
  media: MediaItem;
  goToNextMedia: () => void;
  goToPreviousMedia: () => void;
}) {
  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNextMedia,
    onSwipedRight: goToPreviousMedia,
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 18,
  });

  return (
    <div className={styles.imageStage} {...swipeHandlers}>
      <Image
        src={media.thumbnail}
        alt={media.title?.trim() || "Gallery photo"}
        fill
        priority
        sizes="(max-width: 480px) 100vw, 480px"
        unoptimized={media.thumbnail.startsWith("blob:")}
      />
    </div>
  );
}
