"use client";

import { useEffect, useState } from "react";
import { LuCircleMinus, LuPlus } from "react-icons/lu";
import SearchTimezone from "@/components/screens/clock/SearchTimezone";
import { useClock } from "@/context/ClockContext";
import {
  getClockCityKey,
  getClockCityName,
  getWorldClockDisplay,
} from "@/lib/world-clock";
import styles from "./WorldClock.module.css";

const WorldClock = ({
  editorContainer,
}: {
  editorContainer?: HTMLDivElement | null;
}) => {
  const { selectedTimezones, setSelectedTimezones } = useClock();
  const [choosingCity, setChoosingCity] = useState(false);
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timeout: number;
    const tick = () => {
      window.clearTimeout(timeout);
      if (document.visibilityState !== "visible") return;
      setNow(new Date());
      timeout = window.setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    timeout = window.setTimeout(tick, 0);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className={styles.screen}>
      <header>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.edit}
            disabled={!selectedTimezones.length && !editing}
            aria-label={
              editing ? "Done editing world clocks" : "Edit world clocks"
            }
            aria-pressed={editing}
            onClick={() => setEditing((previous) => !previous)}
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            className={styles.add}
            aria-label="Add city"
            onClick={() => setChoosingCity(true)}
          >
            <LuPlus aria-hidden="true" />
          </button>
        </div>
        <h1 className={styles.title}>World Clock</h1>
      </header>
      <section className={styles.clocks} aria-label="World clocks">
        {selectedTimezones.length === 0 ? (
          <p className={styles.empty}>Add a city to see its local time.</p>
        ) : (
          selectedTimezones.map((zone) => {
            const name = getClockCityName(zone);
            const display = now
              ? getWorldClockDisplay(zone.timezone, now, localTimezone)
              : null;
            return (
              <div className={styles.row} key={getClockCityKey(zone)}>
                {editing && (
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove ${name} clock`}
                    onClick={() =>
                      setSelectedTimezones((previous) =>
                        previous.filter(
                          (item) =>
                            getClockCityKey(item) !== getClockCityKey(zone),
                        ),
                      )
                    }
                  >
                    <LuCircleMinus aria-hidden="true" />
                  </button>
                )}
                <div className={styles.city}>
                  <span className={styles.comparison}>
                    {display?.comparison ??
                      (now ? "Time unavailable" : "Loading time…")}
                  </span>
                  <h2 title={name}>{name}</h2>
                </div>
                <span className={styles.time} aria-label={`${name} time`}>
                  {display?.time ?? "--:--"}
                </span>
              </div>
            );
          })
        )}
      </section>
      {choosingCity && (
        <SearchTimezone
          container={editorContainer}
          onClose={() => setChoosingCity(false)}
        />
      )}
    </div>
  );
};
export default WorldClock;
