import { useId } from "react";
import { moonPhaseName } from "@/lib/weather-presentation";
import styles from "./Weather.module.css";

export default function MoonPhase({ phase }: { phase: number }) {
  const id = useId();
  const waxing = phase < 0.5;
  const terminatorRadius = Math.abs(Math.cos(phase * Math.PI * 2)) * 50;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep =
    phase < 0.25 || phase >= 0.75 ? 1 - outerSweep : outerSweep;
  const illuminated = `M50 0 A50 50 0 0 ${outerSweep} 50 100 A${Math.max(0.01, terminatorRadius)} 50 0 0 ${innerSweep} 50 0`;
  return (
    <svg
      viewBox="0 0 100 100"
      className={styles.moon}
      role="img"
      aria-label={moonPhaseName(phase)}
    >
      <defs>
        <radialGradient id={`${id}-sphere`} cx="35%" cy="30%" r="75%">
          <stop stopColor="#e4e9ee" />
          <stop offset=".65" stopColor="#9aa9b8" />
          <stop offset="1" stopColor="#526a81" />
        </radialGradient>
        <filter id={`${id}-terrain`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".085"
            numOctaves="5"
            seed="17"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
        <clipPath id={`${id}-light`}>
          <path d={illuminated} />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="49" fill="#536a80" />
      <g clipPath={`url(#${id}-light)`}>
        <circle
          cx="50"
          cy="50"
          r="50"
          fill={`url(#${id}-sphere)`}
          filter={`url(#${id}-terrain)`}
        />
        <g fill="#627386" opacity=".23">
          <ellipse cx="34" cy="36" rx="13" ry="20" />
          <ellipse cx="60" cy="56" rx="15" ry="11" />
          <ellipse cx="39" cy="70" rx="14" ry="9" />
        </g>
      </g>
    </svg>
  );
}
