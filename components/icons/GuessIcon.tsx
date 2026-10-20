import { useId } from "react";
import { IconBase, type IconBaseProps } from "react-icons";

/** Sculpted mystery tile, shared by the launcher, game, and Mi Store. */
export default function GuessIcon(props: IconBaseProps) {
  const gradient = useId();
  return (
    <IconBase size="1.35em" viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient
          id={gradient}
          x1="12"
          y1="6"
          x2="52"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b9a3ff" />
          <stop offset=".5" stopColor="#8b65ed" />
          <stop offset="1" stopColor="#6341bf" />
        </linearGradient>
      </defs>
      <ellipse
        cx="32"
        cy="58"
        rx="23"
        ry="4"
        fill="#40247c"
        fillOpacity=".16"
      />
      <g transform="rotate(-10 31 32)">
        <rect x="9" y="10" width="45" height="47" rx="15" fill="#503096" />
        <rect
          x="7"
          y="5"
          width="45"
          height="47"
          rx="15"
          fill={`url(#${gradient})`}
        />
        <path
          d="M15 19v-1a6 6 0 0 1 6-6h10"
          fill="none"
          stroke="#e7daff"
          strokeOpacity=".65"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M23 23c0-9 15-9 15-1 0 6-8 5-8 12"
          fill="none"
          stroke="#51319a"
          strokeWidth="6"
          strokeLinecap="round"
          transform="translate(0 2)"
        />
        <path
          d="M23 23c0-9 15-9 15-1 0 6-8 5-8 12"
          fill="none"
          stroke="#fff8ed"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="30" cy="43" r="3.3" fill="#51319a" />
        <circle cx="30" cy="41" r="3.3" fill="#fff8ed" />
      </g>
      <path
        d="m53 3 2.6 6.4L62 12l-6.4 2.6L53 21l-2.6-6.4L44 12l6.4-2.6L53 3Z"
        fill="#ffd59a"
        stroke="#fff3db"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="m9 43 1.8 4.2L15 49l-4.2 1.8L9 55l-1.8-4.2L3 49l4.2-1.8L9 43Z"
        fill="#e8c6ff"
      />
    </IconBase>
  );
}
