"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  LuCheck,
  LuLockKeyhole,
  LuMoon,
  LuShieldCheck,
  LuSmartphone,
  LuSun,
  LuVolume1,
  LuVolume2,
} from "react-icons/lu";
import { usePhoneAppearanceStore } from "@/stores/usePhoneAppearanceStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { useDeviceStore } from "@/stores/useDeviceStore";
import { IPHONE_MODELS } from "@/lib/iphone-models";
import PinLockControls from "@/components/PinLockControls";
import styles from "./settings.module.css";

export function SettingsSection({
  title,
  children,
  hint,
}: {
  title: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <section className={styles.detailSection} aria-label={title}>
      <h2 className={styles.sectionLabel}>{title}</h2>
      <div className={styles.group}>{children}</div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </section>
  );
}

function RangeSetting({
  label,
  value,
  onChange,
  lowIcon,
  highIcon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowIcon: ReactNode;
  highIcon: ReactNode;
}) {
  const inputId = `settings-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className={styles.rangeSetting}>
      {/*<div className={styles.controlHeading}>*/}
      {/*  <label htmlFor={inputId}>{label}</label>*/}
      {/*  <output htmlFor={inputId}>{value}%</output>*/}
      {/*</div>*/}
      <div className={styles.rangeTrack}>
        <span aria-hidden="true">{lowIcon}</span>
        <input
          id={inputId}
          type="range"
          min="0"
          max="100"
          value={value}
          aria-valuetext={`${value} percent`}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ "--range-fill": `${value}%` } as CSSProperties}
        />
        <span aria-hidden="true">{highIcon}</span>
      </div>
    </div>
  );
}

export function DisplaySettings() {
  const appearance = usePhoneAppearanceStore((state) => state.appearance);
  const setAppearance = usePhoneAppearanceStore((state) => state.setAppearance);
  const brightness = usePhoneSettingsStore((state) => state.brightness);
  const setBrightness = usePhoneSettingsStore((state) => state.setBrightness);
  return (
    <div className={styles.detailStack}>
      <SettingsSection title="Appearance">
        <div
          className={styles.appearanceChoices}
          role="group"
          aria-label="Phone appearance"
        >
          {(["light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={styles.appearanceChoice}
              aria-pressed={appearance === mode}
              onClick={() => setAppearance(mode)}
            >
              <span
                className={styles.themePreview}
                data-preview-theme={mode}
                aria-hidden="true"
              >
                <span className={styles.previewIsland} />
                <span className={styles.previewHeading} />
                <span className={styles.previewCard}>
                  <i />
                  <i />
                  <i />
                </span>
                <span className={styles.previewCard}>
                  <i />
                  <i />
                </span>
                <span className={styles.previewDock}>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <span className={styles.appearanceLabel}>
                {mode === "light" ? <LuSun /> : <LuMoon />}
                {mode === "light" ? "Light" : "Dark"}
              </span>
              <span className={styles.selectionMark} aria-hidden="true">
                {appearance === mode && <LuCheck />}
              </span>
            </button>
          ))}
        </div>
      </SettingsSection>
      <SettingsSection title="Brightness">
        <RangeSetting
          label="Screen brightness"
          value={brightness}
          onChange={setBrightness}
          lowIcon={<LuSun />}
          highIcon={<LuSun />}
        />
      </SettingsSection>
    </div>
  );
}

export function DeviceSettings() {
  const selectedModelId = useDeviceStore((state) => state.selectedModelId);
  const availableModelIds = useDeviceStore(
    (state) => state.availableModelIds,
  );
  const setSelectedModelId = useDeviceStore(
    (state) => state.setSelectedModelId,
  );
  const selectedModel =
    IPHONE_MODELS.find((model) => model.id === selectedModelId) ??
    IPHONE_MODELS[0];

  return (
    <div className={styles.detailStack}>
      <div className={styles.featureHero} data-tone="blue">
        <span className={styles.featureGlyph} aria-hidden="true">
          <LuSmartphone />
        </span>
        <h2>{selectedModel.name}</h2>
        <p>
          Change the virtual shell without closing apps or resetting your phone.
        </p>
      </div>
      <SettingsSection
        title="Phone model"
        hint="Availability depends on the space available for the virtual phone."
      >
        <div
          className={styles.modelChoices}
          role="radiogroup"
          aria-label="Virtual iPhone model"
        >
          {IPHONE_MODELS.map((model) => {
            const available = availableModelIds.includes(model.id);
            const selected = selectedModelId === model.id;
            return (
              <button
                key={model.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!available}
                className={styles.modelChoice}
                onClick={() => setSelectedModelId(model.id)}
              >
                <span className={styles.modelSilhouette} aria-hidden="true">
                  <i />
                </span>
                <span className={styles.modelCopy}>
                  <strong>{model.name}</strong>
                  <span>
                    {model.displayDiagonalInches.toFixed(1)}-inch display
                  </span>
                </span>
                <span className={styles.modelStatus}>
                  {!available ? "Unavailable" : selected ? <LuCheck /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}

export function SoundSettings() {
  const volume = usePhoneSettingsStore((state) => state.volume);
  const setVolume = usePhoneSettingsStore((state) => state.setVolume);
  const silentMode = usePhoneSettingsStore((state) => state.silentMode);
  const toggleSilentMode = usePhoneSettingsStore(
    (state) => state.toggleSilentMode,
  );
  return (
    <div className={styles.detailStack}>
      <SettingsSection
        title="Media volume"
        hint="Volume for audio played by supported mini apps."
      >
        <RangeSetting
          label="Volume"
          value={volume}
          onChange={setVolume}
          lowIcon={<LuVolume1 />}
          highIcon={<LuVolume2 />}
        />
      </SettingsSection>
      <SettingsSection
        title="Ringer & alerts"
        hint="Silent mode is simulated. Browser vibration and hardware haptics are not used."
      >
        <button
          type="button"
          role="switch"
          aria-checked={silentMode}
          aria-label="Silent mode"
          onClick={toggleSilentMode}
          className={styles.switchRow}
        >
          <span className={styles.switchCopy}>
            <strong>Silent mode</strong>
          </span>
          <span
            className={styles.switch}
            data-checked={silentMode}
            aria-hidden="true"
          >
            <span />
          </span>
        </button>
      </SettingsSection>
    </div>
  );
}

export function SecuritySettings() {
  const pinLockEnabled = usePhoneSettingsStore((state) => state.pinLockEnabled);
  return (
    <div className={styles.detailStack}>
      <div className={styles.featureHero} data-tone="blue">
        <span className={styles.featureGlyph} aria-hidden="true">
          {pinLockEnabled ? <LuShieldCheck /> : <LuLockKeyhole />}
        </span>
        <h2>{pinLockEnabled ? "Passcode is on." : "Set a passcode."}</h2>
        <p>
          {pinLockEnabled
            ? "Passcode lock is enabled."
            : "Add a passcode to the virtual lock screen."}
        </p>
      </div>
      <SettingsSection title="Passcode">
        <PinLockControls />
      </SettingsSection>
      <div className={styles.privacyNote}>
        <LuShieldCheck aria-hidden="true" />
        <p>
          This PIN locks the virtual phone only. It does not secure your device
          or encrypt your data.
        </p>
      </div>
    </div>
  );
}
