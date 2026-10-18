import { IconBase, type IconBaseProps } from "react-icons";

/** Mo's orbital globe, shared by every launcher and app preview. */
export default function MoBrowserIcon(props: IconBaseProps) {
  return (
    <IconBase size="1.35em" viewBox="0 0 48 48" {...props}>
      <circle cx="24" cy="24" r="15" fill="currentColor" fillOpacity="0.12" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8">
        <circle cx="24" cy="24" r="15" />
        <ellipse cx="24" cy="24" rx="6.5" ry="15" />
        <path d="M10.6 17.3c8.4 3.4 18.4 3.4 26.8 0M10.6 30.7c8.4-3.4 18.4-3.4 26.8 0" />
      </g>
      <ellipse
        cx="24"
        cy="24"
        rx="22"
        ry="8"
        transform="rotate(-34 24 24)"
        fill="none"
        stroke="#a5f3fc"
        strokeWidth="2.6"
      />
      <circle cx="40.8" cy="12.7" r="3.2" fill="#ecfeff" />
    </IconBase>
  );
}
