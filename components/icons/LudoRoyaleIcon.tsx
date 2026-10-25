import { IconBase, type IconBaseProps } from "react-icons";

/** Cinematic capture-and-return artwork shared across launcher surfaces. */
export default function LudoRoyaleIcon(props: IconBaseProps) {
  return (
    <IconBase size="1.35em" viewBox="0 0 512 512" {...props}>
      <image
        href="/images/ludo-capture-icon.webp"
        width="512"
        height="512"
        preserveAspectRatio="xMidYMid slice"
      />
    </IconBase>
  );
}
