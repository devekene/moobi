import type { WeatherCondition } from "@/types";
import {
  LuCloud,
  LuCloudFog,
  LuCloudLightning,
  LuCloudRain,
  LuCloudSnow,
  LuCloudSun,
  LuMoon,
  LuSun,
} from "react-icons/lu";

export default function WeatherIcon({
  condition,
  className,
}: {
  condition: WeatherCondition;
  className?: string;
}) {
  const code = condition.code;
  const Icon =
    code >= 95
      ? LuCloudLightning
      : [71, 73, 75, 77, 85, 86].includes(code)
        ? LuCloudSnow
        : code >= 51 && code <= 82
          ? LuCloudRain
          : code === 45 || code === 48
            ? LuCloudFog
            : code === 3
              ? LuCloud
              : code === 2
                ? LuCloudSun
                : code === 0 || code === 1
                  ? condition.is_day
                    ? LuSun
                    : LuMoon
                  : LuCloud;
  return <Icon className={className} role="img" aria-label={condition.text} />;
}
