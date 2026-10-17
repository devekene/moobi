"use client";

import { useBatteryStore } from "@/stores/useBatteryStore";
import { LOW_BATTERY_THRESHOLD } from "@/lib/battery";
import { LuBatteryCharging, LuPlug, LuRotateCcw, LuZap } from "react-icons/lu";
import { SettingsSection } from "./settings/SettingsDetails";
import styles from "./settings/settings.module.css";

export default function BatteryControls() {
  const level = useBatteryStore((state) => state.level);
  const phase = useBatteryStore((state) => state.chargerPhase);
  const dismissed = useBatteryStore((state) => state.lowBatteryDismissed);
  const isLow = level <= LOW_BATTERY_THRESHOLD;
  const connected = phase === "connected";
  const connecting = phase === "connecting";
  const connect = () =>
    useBatteryStore.getState().beginChargerConnection(Date.now());
  return (
    <div className={styles.detailStack}>
      <section
        className={styles.batteryHero}
        aria-label="Virtual battery level"
        data-low={isLow}
      >
        <div
          className={styles.batteryIllustration}
          role="img"
          aria-label={`Virtual battery ${Math.round(level)} percent`}
        >
          <span
            className={styles.batteryFill}
            style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
          />
          {connected && <LuZap aria-hidden="true" />}
        </div>
        <div className={styles.batteryPercentage}>
          {Math.round(level)}
          <span>%</span>
        </div>
        <p role="status">
          {connected
            ? "Charging"
            : connecting
              ? "Connecting charger…"
              : isLow
                ? "Time for a recharge"
                : "Ready to explore"}
        </p>
      </section>
      <SettingsSection
        title="Power"
        hint="Battery and charging are simulated in this browser. Your real device is unaffected."
      >
        <div className={styles.infoRow}>
          <span>Power source</span>
          <span>
            {connected ? "Charger" : connecting ? "Connecting…" : "Battery"}
          </span>
        </div>
        <button
          type="button"
          className={styles.actionRow}
          disabled={connecting}
          onClick={
            connected
              ? () => useBatteryStore.getState().disconnectCharger(Date.now())
              : connect
          }
        >
          <span className={styles.actionLabel}>
            <LuPlug aria-hidden="true" />
            {connected
              ? "Disconnect charger"
              : connecting
                ? "Connecting…"
                : "Connect charger"}
          </span>
          <LuBatteryCharging aria-hidden="true" />
        </button>
      </SettingsSection>
      {isLow && !dismissed && (
        <div className={styles.notice} role="status">
          <strong>Running low</strong>
          <p>Connect your charger to keep exploring.</p>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => useBatteryStore.getState().dismissLowBattery()}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
