import { IconBase, type IconBaseProps } from "react-icons";

/** The garden snake character, shared by the launcher, library, and Mi Store. */
export default function SnakeIcon(props: IconBaseProps) {
  return (
    <IconBase size="1.35em" viewBox="0 0 64 64" {...props}>
      <ellipse
        cx="31"
        cy="55"
        rx="23"
        ry="3"
        fill="#183d2b"
        fillOpacity=".16"
      />
      <path
        d="M13 47C3 32 20 27 26 39C33 54 48 54 51 43C55 31 40 27 35 37C28 49 17 37 24 27C31 17 45 30 46 17"
        fill="none"
        stroke="#236e46"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M13 45C3 30 20 25 26 37C33 52 48 52 51 41C55 29 40 25 35 35C28 47 17 35 24 25C31 15 45 28 46 15"
        fill="none"
        stroke="#74b95f"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M13 42C9 34 16 31 20 35M30 43Q40 51 46 44M28 23Q34 22 39 25"
        fill="none"
        stroke="#bde28b"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse
        cx="46"
        cy="16"
        rx="9"
        ry="10"
        transform="rotate(-12 46 16)"
        fill="#8dcd70"
      />
      <ellipse cx="41" cy="11" rx="3.8" ry="4.7" fill="#fafbec" />
      <ellipse cx="50" cy="10" rx="3.8" ry="4.7" fill="#fafbec" />
      <ellipse cx="42" cy="10" rx="1.7" ry="2.5" fill="#173e2a" />
      <ellipse cx="51" cy="9" rx="1.7" ry="2.5" fill="#173e2a" />
      <path
        d="M44 20Q47 23 50 19"
        fill="none"
        stroke="#316d43"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="40" cy="18" r="1.8" fill="#c5de81" />
    </IconBase>
  );
}
