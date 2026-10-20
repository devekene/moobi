"use client";

import PhoneModel3D from "@/components/screens/PhoneModel3D";
import { downloadPhoneScreenshot } from "@/lib/phone-screenshot";
import { LuCamera } from "react-icons/lu";
import {
  getVisibleDeviceSurface,
  type DeviceRotation,
} from "@/lib/device-rotation";
import { getPhoneRenderSize } from "@/lib/phone-geometry";
import type { IPhoneModel, PreviewSize } from "@/lib/iphone-models";
import type { PhoneScreen } from "@/lib/app-registry";
import type { ChargerPhase } from "@/lib/battery";
import type { HardwareButtonId } from "@/lib/phone-buttons";
import React, { useRef, useState } from "react";

type VirtualIPhoneProps = {
  showDeviceControls: boolean;
  model: IPhoneModel;
  size: PreviewSize;
  brightness: number;
  isOn: boolean;
  chargerPhase: ChargerPhase;
  currentScreen: PhoneScreen;
  showControlCenter: boolean;
  showAppSwitcher: boolean;
  ringingAlarmId: number | null;
  onHardwareButton: (button: HardwareButtonId) => void;
  onHardwareButtonRelease: (button: HardwareButtonId) => void;
  children: React.ReactNode;
};

type ActivePointer = {
  id: number;
  x: number;
  y: number;
  rotation: DeviceRotation;
  moved: boolean;
};

const TURN_CONTROL_CLASS =
  "flex h-10 min-w-10 items-center justify-center rounded-xl text-lg text-[var(--phone-text)] transition hover:bg-[var(--phone-surface-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)] motion-reduce:transition-none";

const VirtualIPhone = ({
  showDeviceControls,
  model,
  size,
  brightness,
  isOn,
  chargerPhase,
  currentScreen,
  showControlCenter,
  showAppSwitcher,
  ringingAlarmId,
  onHardwareButton,
  onHardwareButtonRelease,
  children,
}: VirtualIPhoneProps) => {
  const [rotation, setRotation] = useState<DeviceRotation>({
    pitch: 0,
    yaw: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [screenshotStatus, setScreenshotStatus] = useState("");
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const rotationRef = useRef(rotation);
  const pointerRef = useRef<ActivePointer | null>(null);
  const draggedRef = useRef(false);
  const rotationFrameRef = useRef<number | null>(null);
  const visibleSurface = getVisibleDeviceSurface(rotation);
  const screenIsFacingUser = visibleSurface === "front";
  const captureSize = getPhoneRenderSize(size, chargerPhase !== "disconnected");

  const updateRotation = (next: DeviceRotation) => {
    rotationRef.current = next;
    setRotation(next);
  };

  const animateRotationTo = (next: DeviceRotation) => {
    if (rotationFrameRef.current !== null) {
      window.cancelAnimationFrame(rotationFrameRef.current);
      rotationFrameRef.current = null;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updateRotation(next);
      return;
    }
    const start = rotationRef.current;
    const startedAt = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 320);
      const eased = 1 - (1 - progress) ** 3;
      updateRotation({
        pitch: start.pitch + (next.pitch - start.pitch) * eased,
        yaw: start.yaw + (next.yaw - start.yaw) * eased,
      });
      if (progress < 1) {
        rotationFrameRef.current = window.requestAnimationFrame(step);
      } else {
        rotationFrameRef.current = null;
      }
    };
    rotationFrameRef.current = window.requestAnimationFrame(step);
  };

  React.useEffect(
    () => () => {
      if (rotationFrameRef.current !== null) {
        window.cancelAnimationFrame(rotationFrameRef.current);
      }
    },
    [],
  );

  const resetToFront = () => animateRotationTo({ pitch: 0, yaw: 0 });
  const rotateBy = (pitch: number, yaw: number) => {
    animateRotationTo({
      pitch: rotationRef.current.pitch + pitch,
      yaw: rotationRef.current.yaw + yaw,
    });
  };
  const showOtherFace = () =>
    animateRotationTo(
      visibleSurface === "back" ? { pitch: 0, yaw: 0 } : { pitch: 0, yaw: 180 },
    );

  const saveScreenshot = async () => {
    const phoneElement = document.querySelector<HTMLElement>(
      '[data-phone-capture="true"]',
    );
    if (!phoneElement) {
      setScreenshotStatus("The phone image is not ready yet.");
      return;
    }

    setIsCapturingScreenshot(true);
    setScreenshotStatus("Creating screenshot…");
    try {
      await downloadPhoneScreenshot(phoneElement, currentScreen);
      setScreenshotStatus("Screenshot saved.");
    } catch {
      setScreenshotStatus(
        "Could not capture the phone. Try again when the screen is fully visible.",
      );
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target instanceof Element &&
        event.target.closest(
          "button, a, input, select, textarea, [role='button'], [data-no-turntable], [data-phone-screen]",
        ))
    ) {
      return;
    }
    if (rotationFrameRef.current !== null) {
      window.cancelAnimationFrame(rotationFrameRef.current);
      rotationFrameRef.current = null;
    }
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotation: rotationRef.current,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    if (!pointer.moved && Math.hypot(deltaX, deltaY) < 5) return;
    if (!pointer.moved) {
      pointer.moved = true;
      draggedRef.current = true;
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    updateRotation({
      pitch: pointer.rotation.pitch - deltaY * 0.55,
      yaw: pointer.rotation.yaw + deltaX * 0.55,
    });
  };

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current?.id !== event.pointerId) return;
    const moved = pointerRef.current.moved;
    pointerRef.current = null;
    setIsDragging(false);
    if (moved && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (moved) {
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 0);
    }
  };

  const stopClickAfterDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedRef.current || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    draggedRef.current = false;
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2">
      <div
        className={`relative flex min-h-0 w-full flex-1 items-center justify-center ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClickCapture={stopClickAfterDrag}
        role="region"
        aria-label={`Virtual ${model.name} turntable, showing ${visibleSurface}. Drag to rotate the phone.`}
      >
        <div
          data-phone-capture="true"
          className="relative flex shrink-0 items-center justify-center"
          style={{
            width: captureSize.width,
            height: captureSize.height,
            margin: `${(size.height - captureSize.height) / 2}px ${(size.width - captureSize.width) / 2}px`,
          }}
        >
          <div
            className="relative shrink-0"
            style={{ width: size.width, height: size.height }}
          >
            <PhoneModel3D
              model={model}
              size={size}
              rotation={rotation}
              brightness={brightness}
              isOn={isOn}
              chargerPhase={chargerPhase}
              isFrontVisible={screenIsFacingUser}
              currentScreen={currentScreen}
              showControlCenter={showControlCenter}
              showAppSwitcher={showAppSwitcher}
              ringingAlarmId={ringingAlarmId}
              onHardwareButton={onHardwareButton}
              onHardwareButtonRelease={onHardwareButtonRelease}
              onWebGLStatusChange={setWebglAvailable}
            >
              {children}
            </PhoneModel3D>
          </div>
        </div>
      </div>

      <div
        className={`${showDeviceControls ? "flex" : "hidden"} shrink-0 flex-wrap items-center justify-center gap-1 rounded-2xl border border-[var(--phone-border)] bg-[var(--phone-surface)]/95 p-1.5 shadow-md`}
      >
        <button
          type="button"
          onClick={() => rotateBy(0, -45)}
          disabled={webglAvailable === false}
          className={TURN_CONTROL_CLASS}
          aria-label="Rotate toward left"
          title="Rotate toward left"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => rotateBy(0, 45)}
          disabled={webglAvailable === false}
          className={TURN_CONTROL_CLASS}
          aria-label="Rotate toward right"
          title="Rotate toward right"
        >
          →
        </button>
        <button
          type="button"
          onClick={() => rotateBy(45, 0)}
          disabled={webglAvailable === false}
          className={TURN_CONTROL_CLASS}
          aria-label="Tilt toward top edge"
          title="Tilt toward top edge"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => rotateBy(-45, 0)}
          disabled={webglAvailable === false}
          className={TURN_CONTROL_CLASS}
          aria-label="Tilt toward bottom edge"
          title="Tilt toward bottom edge"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={showOtherFace}
          disabled={webglAvailable === false}
          className={`${TURN_CONTROL_CLASS} min-w-24 px-3 text-xs`}
          aria-label={
            visibleSurface === "back"
              ? "Return to front screen"
              : "Show phone back"
          }
        >
          {visibleSurface === "back" ? "Show screen" : "Show back"}
        </button>
        <button
          type="button"
          onClick={resetToFront}
          disabled={webglAvailable === false}
          className={TURN_CONTROL_CLASS}
          aria-label="Reset phone to front view"
          title="Reset to front"
        >
          ⟲
        </button>
        <button
          type="button"
          onClick={() => void saveScreenshot()}
          disabled={isCapturingScreenshot}
          className={`${TURN_CONTROL_CLASS} gap-2 px-3 text-sm`}
          aria-label="Save screenshot of the virtual phone"
          title="Save screenshot"
        >
          <LuCamera aria-hidden="true" />
          <span className="hidden sm:inline">Screenshot</span>
        </button>
        <span className="sr-only" aria-live="polite">
          Showing phone {visibleSurface}
        </span>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {screenshotStatus}
      </span>
      {webglAvailable === false && (
        <p
          role="status"
          className="text-center text-xs text-[var(--phone-text-muted)]"
        >
          3D is unavailable in this browser. The phone is shown from the front.
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {screenIsFacingUser
          ? "Phone screen is available"
          : "Phone screen is turned away"}
      </span>
    </div>
  );
};

export default VirtualIPhone;
