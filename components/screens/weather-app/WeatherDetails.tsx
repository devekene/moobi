import type { ReactNode } from "react";
import type { WeatherData } from "@/types";
import {
  LuDroplets,
  LuEye,
  LuGauge,
  LuMoon,
  LuSun,
  LuSunrise,
  LuThermometer,
  LuUmbrella,
  LuWind,
} from "react-icons/lu";
import { moonPhaseName } from "@/lib/weather-presentation";
import styles from "./Weather.module.css";
import MoonPhase from "./MoonPhase";

function Tile({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.card} ${styles.tile}`}>
      <h2 className={styles.label}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function WeatherDetails({
  data,
  celsius,
}: {
  data: WeatherData;
  celsius: boolean;
}) {
  const { current, forecast } = data;
  const today = forecast.forecastday[0];
  const tomorrow = forecast.forecastday[1];
  const temp = (c: number) => `${Math.round(celsius ? c : (c * 9) / 5 + 32)}°`;
  const time = (epoch: number | null) =>
    epoch === null
      ? "Not today"
      : new Date(epoch * 1000).toLocaleTimeString("en-GB", {
          timeZone: data.location.timezone,
          hour: "2-digit",
          minute: "2-digit",
        });
  const uvLabel =
    current.uv < 3
      ? "Low"
      : current.uv < 6
        ? "Moderate"
        : current.uv < 8
          ? "High"
          : current.uv < 11
            ? "Very high"
            : "Extreme";
  const dayProgress = Math.max(
    0,
    Math.min(
      1,
      (current.time_epoch - today.sunrise) / (today.sunset - today.sunrise),
    ),
  );
  return (
    <div className={styles.details}>
      <Tile title="DAILY RANGE" icon={<LuThermometer />}>
        <div className={styles.metric}>{temp(today.day.maxtemp_c)}</div>
        <strong>Today’s high</strong>
        <p className={styles.tileFoot}>
          Low <b>{temp(today.day.mintemp_c)}</b>
          <br />
          {current.condition.text}
        </p>
      </Tile>
      <Tile title="WIND" icon={<LuWind />}>
        <div className={styles.compass}>
          <span className={styles.north}>N</span>
          <span className={styles.east}>E</span>
          <span className={styles.south}>S</span>
          <span className={styles.west}>W</span>
          <div
            className={styles.compassNeedle}
            style={{ transform: `rotate(${current.wind_degree}deg)` }}
          >
            ↑
          </div>
          <strong>
            {Math.round(current.wind_kph)}
            <small>km/h</small>
          </strong>
        </div>
        <p className={styles.tileFoot}>
          Gusts: {Math.round(current.gust_kph)} km/h {current.wind_dir}
        </p>
      </Tile>
      <Tile
        title={moonPhaseName(today.moon_phase).toUpperCase()}
        icon={<LuMoon />}
      >
        <MoonPhase phase={today.moon_phase} />
        <p className={styles.tileFoot}>Moonrise: {time(today.moonrise)}</p>
      </Tile>
      <Tile title="SUNRISE" icon={<LuSunrise />}>
        <div className={styles.metric}>{time(today.sunrise)}</div>
        <svg
          className={styles.sunGraph}
          viewBox="0 0 180 90"
          aria-label="Sun’s progress from sunrise to sunset"
          role="img"
        >
          <path d="M-10 80 C35 80 47 5 90 5 S145 80 190 80" />
          <line x1="0" y1="48" x2="180" y2="48" />
          <circle
            cx={dayProgress * 180}
            cy={80 - Math.sin(dayProgress * Math.PI) * 75}
            r="4"
          />
        </svg>
        <p className={styles.tileFoot}>Sunset: {time(today.sunset)}</p>
      </Tile>
      <Tile title="UV INDEX" icon={<LuSun />}>
        <div className={styles.metric}>{Math.round(current.uv)}</div>
        <strong>{uvLabel}</strong>
        <div className={styles.uvTrack}>
          <i style={{ left: `${Math.min(100, (current.uv / 12) * 100)}%` }} />
        </div>
        <p className={styles.tileFoot}>
          {today.day.uv >= 3
            ? "Use sun protection during daylight hours."
            : "Low UV levels expected today."}
        </p>
      </Tile>
      <Tile title="FEELS LIKE" icon={<LuThermometer />}>
        <div className={styles.metric}>{temp(current.feelslike_c)}</div>
        <p className={styles.tileFoot}>
          {Math.abs(current.feelslike_c - current.temp_c) < 1
            ? "Similar to the actual temperature."
            : `It feels ${current.feelslike_c > current.temp_c ? "warmer" : "cooler"} than the actual temperature.`}
        </p>
      </Tile>
      <Tile title="PRECIPITATION" icon={<LuUmbrella />}>
        <div className={styles.metric}>
          {today.day.totalprecip_mm}
          <small> mm</small>
        </div>
        <strong>Today</strong>
        <p className={styles.tileFoot}>
          {tomorrow
            ? `${tomorrow.day.totalprecip_mm} mm expected tomorrow.`
            : "Daily total precipitation."}
        </p>
      </Tile>
      <Tile title="VISIBILITY" icon={<LuEye />}>
        <div className={styles.metric}>
          {current.vis_miles === null
            ? "—"
            : Math.round(current.vis_miles * 1.609344)}
          <small> km</small>
        </div>
        <p className={styles.tileFoot}>
          {current.vis_miles === null
            ? "Visibility unavailable."
            : current.vis_miles > 6
              ? "Clear view."
              : "Reduced visibility."}
        </p>
      </Tile>
      <Tile title="HUMIDITY" icon={<LuDroplets />}>
        <div className={styles.metric}>{current.humidity}%</div>
        <p className={styles.tileFoot}>
          The dew point is {temp(current.dewpoint_c)} right now.
        </p>
      </Tile>
      <Tile title="PRESSURE" icon={<LuGauge />}>
        <div className={styles.pressureGauge}>
          <span>↑</span>
          <b>{Math.round(current.pressure_mb)}</b>
          <small>hPa</small>
        </div>
        <p className={styles.gaugeLabels}>
          Low <span>High</span>
        </p>
      </Tile>
    </div>
  );
}
