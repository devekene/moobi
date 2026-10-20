import { IconBase, type IconBaseProps } from "react-icons";

/** Ivory knight and brass plinth, shared across Chess discovery surfaces. */
export default function ChessMogulIcon(props: IconBaseProps) {
  return (
    <IconBase size="1.35em" viewBox="6 5 36 38" {...props}>
      <path
        d="M13 33c.3-6.5 2.8-12 8.5-16.6l-.9-6.6 5.6 3.3 3.6-.8 8 9.7c.6.8.7 1.7.2 2.5l-1.8 2.9-7.1-1.8c-1.7 2.7-1.5 5.2.9 7.4H13Z"
        fill="#fff8e9"
      />
      <path
        d="M24 18c-4.5 4.4-6.6 8.8-6.8 13"
        fill="none"
        stroke="#b49353"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="m30 16 2 2.5-2.6.8.6-3.3Z" fill="#193a2b" />
      <path
        d="m34 24 2 .5"
        stroke="#193a2b"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <rect x="12" y="34.5" width="21" height="2.5" rx="1.25" fill="#b49353" />
      <path d="M11 38h23l2 3H9l2-3Z" fill="#fff8e9" />
    </IconBase>
  );
}
