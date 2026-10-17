"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { LuChevronRight } from "react-icons/lu";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { validatePhonePinSetup } from "@/lib/pin-lock";
import styles from "@/components/screens/settings/settings.module.css";

export default function PinLockControls({
  setupOnly = false,
  onComplete,
}: {
  setupOnly?: boolean;
  onComplete?: () => void;
}) {
  const enabled = usePhoneSettingsStore((state) => state.pinLockEnabled);
  const configuredPin = usePhoneSettingsStore((state) => state.pinCode);
  const [editing, setEditing] = useState(setupOnly);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);
  useLayoutEffect(() => {
    if (wasEditing.current && !editing)
      trigger.current?.focus({ preventScroll: true });
    wasEditing.current = editing;
  }, [editing]);
  const close = () => {
    setEditing(false);
    setNewPin("");
    setConfirmPin("");
    setError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextError = validatePhonePinSetup(newPin, confirmPin);
    if (nextError) {
      setError(nextError);
      return;
    }
    usePhoneSettingsStore.getState().setPinLock(newPin);
    close();
    setSaved(true);
    onComplete?.();
  };
  return (
    <>
      {!setupOnly && (
        <>
          <div className={styles.infoRow}>
            <span>PIN lock</span>
            <span className={styles.statusPill} data-active={enabled}>
              {enabled ? "On" : "Off"}
            </span>
          </div>
          {!editing && (
            <>
              <button
                ref={trigger}
                type="button"
                className={styles.actionRow}
                onClick={() => {
                  setEditing(true);
                  setSaved(false);
                }}
              >
                {configuredPin ? "Change passcode" : "Set up passcode"}
                <LuChevronRight aria-hidden="true" />
              </button>
              {configuredPin && (
                <button
                  type="button"
                  className={styles.actionRow}
                  onClick={() => {
                    if (enabled)
                      usePhoneSettingsStore.getState().disablePinLock();
                    else
                      usePhoneSettingsStore
                        .getState()
                        .setPinLock(configuredPin);
                    setSaved(false);
                  }}
                >
                  {enabled ? "Turn passcode off" : "Turn passcode on"}
                  <LuChevronRight aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </>
      )}
      {editing && (
        <form className={styles.pinForm} onSubmit={submit} noValidate>
          <p className={styles.formIntro}>Choose a four-digit passcode.</p>
          {[
            { label: "New PIN", value: newPin, set: setNewPin, name: "new" },
            {
              label: "Confirm PIN",
              value: confirmPin,
              set: setConfirmPin,
              name: "confirm",
            },
          ].map((field, index) => (
            <label key={field.name} className={styles.pinField}>
              <span>{field.label}</span>
              <input
                autoFocus={index === 0}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={field.value}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(event) => {
                  field.set(event.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                placeholder="••••"
              />
            </label>
          ))}
          {error && (
            <p id={`${id}-error`} className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={styles.primaryButton}>
            Save passcode
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              close();
              onComplete?.();
            }}
          >
            Cancel
          </button>
        </form>
      )}
      {saved && (
        <p role="status" className={styles.savedMessage}>
          Passcode saved.
        </p>
      )}
    </>
  );
}
