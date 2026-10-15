"use client";

import { useBatteryStore } from "@/stores/useBatteryStore";
import { LOW_BATTERY_THRESHOLD } from "@/lib/battery";
import { BsLightningChargeFill } from "react-icons/bs";
import { MdBattery3Bar } from "react-icons/md";

const BatteryControls = () => {
  const level = useBatteryStore((state) => state.level);
  const phase = useBatteryStore((state) => state.chargerPhase);
  const lowBatteryDismissed = useBatteryStore(
    (state) => state.lowBatteryDismissed,
  );
  const isLow = level <= LOW_BATTERY_THRESHOLD && !lowBatteryDismissed;
  const connect = () =>
    useBatteryStore.getState().beginChargerConnection(Date.now());
  const disconnect = () =>
    useBatteryStore.getState().disconnectCharger(Date.now());
  const recharge = () => useBatteryStore.getState().recharge(Date.now());

  return (
    <section
      aria-label="Virtual battery controls"
      className="rounded-xl bg-[var(--phone-surface)] p-2 text-[var(--phone-text)]"
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex min-w-0 items-center gap-2 text-xs"
          role="status"
          aria-label={`Virtual battery ${Math.round(level)} percent`}
        >
          {phase === "connected" ? (
            <BsLightningChargeFill className="size-4 shrink-0 text-[var(--phone-accent)]" aria-hidden="true" />
          ) : (
            <MdBattery3Bar className="size-5 shrink-0 rotate-90" aria-hidden="true" />
          )}
          <span className="font-semibold">{Math.round(level)}%</span>
          <span className="truncate text-[var(--phone-text-muted)]">Virtual battery</span>
        </div>
        {phase === "connected" ? (
          <button
            type="button"
            onClick={disconnect}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-[var(--phone-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)]"
          >
            Unplug
          </button>
        ) : phase === "connecting" ? (
          <span className="shrink-0 px-2 py-1 text-xs text-[var(--phone-text-muted)]" role="status">
            Connecting…
          </span>
        ) : (
          <button
            type="button"
            onClick={connect}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-[var(--phone-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)]"
          >
            Connect charger
          </button>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[10px] text-[var(--phone-text-muted)]" aria-live="polite">
          {phase === "connected"
            ? "Charger connected"
            : phase === "connecting"
              ? "Connecting to the rendered charging port"
              : "Simulation only"}
        </p>
        <button
          type="button"
          onClick={recharge}
          className="shrink-0 rounded-lg px-2 py-1 text-[10px] text-[var(--phone-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)]"
        >
          Recharge to 100%
        </button>
      </div>
      {isLow && (
        <div className="mt-2 rounded-lg border border-[var(--phone-border)] bg-[var(--phone-surface-elevated)] p-2" aria-live="polite">
          <p className="text-xs font-semibold">Virtual battery is low</p>
          <p className="text-[10px] text-[var(--phone-text-muted)]">
            {Math.round(level)}% remaining in this simulation.
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => useBatteryStore.getState().dismissLowBattery()}
              className="rounded-lg px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)]"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={connect}
              disabled={phase !== "disconnected"}
              className="rounded-lg bg-[var(--phone-accent)] px-2 py-1 text-xs font-medium text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--phone-focus)]"
            >
              Charge
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default BatteryControls;
