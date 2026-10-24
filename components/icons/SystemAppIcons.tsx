import { useId } from "react";
import { IconBase, type IconBaseProps } from "react-icons";

function TileShadow() {
  return (
    <ellipse cx="32" cy="59" rx="23" ry="3" fill="#05070d" fillOpacity=".18" />
  );
}

/** A layered photo bloom for Gallery, shared by every app surface. */
export function GalleryIcon(props: IconBaseProps) {
  const gradient = useId();
  const glow = useId();
  return (
    <IconBase size="1.7em" viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id={gradient} x1="8" y1="5" x2="57" y2="59">
          <stop stopColor="#a58bff" />
          <stop offset=".5" stopColor="#7562ed" />
          <stop offset="1" stopColor="#4937a9" />
        </linearGradient>
        <radialGradient
          id={glow}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(20 14) rotate(47) scale(50)"
        >
          <stop stopColor="#fff" stopOpacity=".34" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradient})`} />
      <rect width="64" height="64" rx="18" fill={`url(#${glow})`} />
      <path
        d="M15 19a7 7 0 0 1 7-7h9"
        fill="none"
        stroke="#fff"
        strokeOpacity=".48"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g transform="translate(32 32)">
        <ellipse
          rx="7"
          ry="16"
          transform="rotate(0) translate(0 -7)"
          fill="#ffcf72"
        />
        <ellipse
          rx="7"
          ry="16"
          transform="rotate(72) translate(0 -7)"
          fill="#ff7e98"
        />
        <ellipse
          rx="7"
          ry="16"
          transform="rotate(144) translate(0 -7)"
          fill="#c68cff"
        />
        <ellipse
          rx="7"
          ry="16"
          transform="rotate(216) translate(0 -7)"
          fill="#6ddbc7"
        />
        <ellipse
          rx="7"
          ry="16"
          transform="rotate(288) translate(0 -7)"
          fill="#79b9ff"
        />
        <circle r="7.5" fill="#fff8e8" />
        <circle r="3.6" fill="#4c3cad" />
      </g>
    </IconBase>
  );
}

/** A warm tear-off date card for Calendar. */
export function CalendarIcon(props: IconBaseProps) {
  const paper = useId();
  return (
    <IconBase size="1.7em" viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id={paper} x1="12" y1="9" x2="53" y2="56">
          <stop stopColor="#fffdf8" />
          <stop offset="1" stopColor="#e8eaf2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#ef5465" />
      <path
        d="M0 22h64v24c0 10-8 18-18 18H18C8 64 0 56 0 46V22Z"
        fill={`url(#${paper})`}
      />
      <path
        d="M14 14c0-3 2.4-5.5 5.5-5.5S25 11 25 14M39 14c0-3 2.4-5.5 5.5-5.5S50 11 50 14"
        fill="none"
        stroke="#8f2837"
        strokeOpacity=".55"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <text
        x="32"
        y="46"
        textAnchor="middle"
        fill="#252833"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="25"
        fontWeight="750"
        letterSpacing="-1.5"
      >
        24
      </text>
      <path
        d="M14 19h36"
        stroke="#ff94a0"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

/** A dimensional precision dial for Settings. */
export function SettingsIcon(props: IconBaseProps) {
  const gradient = useId();
  return (
    <IconBase size="1.7em" viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id={gradient} x1="8" y1="5" x2="57" y2="59">
          <stop stopColor="#4a4d59" />
          <stop offset="1" stopColor="#17191f" />
        </linearGradient>
      </defs>
      <TileShadow />
      <rect
        x="5"
        y="4"
        width="54"
        height="54"
        rx="17"
        fill={`url(#${gradient})`}
      />
      <circle
        cx="32"
        cy="31"
        r="18"
        fill="#777c8b"
        fillOpacity=".3"
        stroke="#c9ccd6"
        strokeOpacity=".55"
        strokeWidth="2"
      />
      <g fill="#dfe1e7">
        <rect x="29" y="8" width="6" height="10" rx="3" />
        <rect x="29" y="44" width="6" height="10" rx="3" />
        <rect x="45" y="26" width="10" height="6" rx="3" />
        <rect x="9" y="26" width="10" height="6" rx="3" />
        <rect
          x="43.2"
          y="12.6"
          width="6"
          height="10"
          rx="3"
          transform="rotate(45 46.2 17.6)"
        />
        <rect
          x="14.8"
          y="41"
          width="6"
          height="10"
          rx="3"
          transform="rotate(45 17.8 46)"
        />
        <rect
          x="41"
          y="43.2"
          width="10"
          height="6"
          rx="3"
          transform="rotate(45 46 46.2)"
        />
        <rect
          x="12.6"
          y="14.8"
          width="10"
          height="6"
          rx="3"
          transform="rotate(45 17.6 17.8)"
        />
      </g>
      <circle
        cx="32"
        cy="31"
        r="12.5"
        fill="#eff0f4"
        stroke="#fff"
        strokeOpacity=".5"
      />
      <circle cx="32" cy="31" r="6" fill="#4d5260" />
      <circle cx="30" cy="29" r="2" fill="#9298a7" />
    </IconBase>
  );
}

/** A midnight analog face for Clock. */
export function ClockIcon(props: IconBaseProps) {
  const gradient = useId();
  return (
    <IconBase size="1.7em" viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id={gradient} x1="10" y1="7" x2="54" y2="58">
          <stop stopColor="#28314c" />
          <stop offset="1" stopColor="#10131e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradient})`} />
      <circle cx="32" cy="31" r="20" fill="#f5f0e7" />
      <circle cx="32" cy="31" r="17.5" fill="#fffdf8" stroke="#d6cfbf" />
      <g stroke="#343742" strokeLinecap="round">
        <path d="M32 15v3M32 44v3M16 31h3M45 31h3" strokeWidth="2" />
        <path
          d="m20.7 19.7 1.8 1.8m19 19 1.8 1.8m0-22.6-1.8 1.8m-19 19-1.8 1.8"
          strokeWidth="1.4"
        />
        <path d="M32 31V20" strokeWidth="3" />
        <path d="m32 31 8 5" stroke="#7b65ea" strokeWidth="3.5" />
      </g>
      <path
        d="M32 31 24 42"
        stroke="#ef5668"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="32" cy="31" r="3" fill="#2d3039" />
      <circle cx="32" cy="31" r="1.2" fill="#fff" />
    </IconBase>
  );
}

/** A tactile keypad with a warm operation rail for Calculator. */
export function CalculatorIcon(props: IconBaseProps) {
  const gradient = useId();
  return (
    <IconBase size="1.7em" viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id={gradient} x1="7" y1="5" x2="58" y2="59">
          <stop stopColor="#383b45" />
          <stop offset="1" stopColor="#17191e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradient})`} />
      <rect
        x="13"
        y="12"
        width="38"
        height="11"
        rx="5.5"
        fill="#111318"
        stroke="#666b78"
        strokeOpacity=".7"
      />
      <path
        d="M40 17.5h5"
        stroke="#f0f1f4"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g fill="#626774">
        <circle cx="18" cy="31" r="4" />
        <circle cx="29" cy="31" r="4" />
        <circle cx="18" cy="42" r="4" />
        <circle cx="29" cy="42" r="4" />
        <rect x="14" y="49" width="19" height="6" rx="3" />
      </g>
      <g fill="#f2a04f">
        <circle cx="43" cy="31" r="4.5" />
        <circle cx="43" cy="42" r="4.5" />
        <rect x="38.5" y="49" width="9" height="6" rx="3" />
      </g>
      <path
        d="M40.5 31h5M43 28.5v5M40.5 42h5M40.5 52h5"
        fill="none"
        stroke="#fff8ef"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconBase>
  );
}
