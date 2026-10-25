"use client";

import PhoneModel3D from "@/components/screens/PhoneModel3D";
import { getPhoneRenderSize } from "@/lib/phone-geometry";
import type { IPhoneModel, PreviewSize } from "@/lib/iphone-models";
import type { PhoneScreen } from "@/lib/app-registry";
import type { ChargerPhase } from "@/lib/battery";
import type { HardwareButtonId } from "@/lib/phone-buttons";
import type { ReactNode } from "react";

type VirtualIPhoneProps = {
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
  children: ReactNode;
};

const VirtualIPhone = ({
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
  const captureSize = getPhoneRenderSize(
    size,
    chargerPhase !== "disconnected",
  );
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div
        data-phone-capture="true"
        className="relative flex shrink-0 items-center justify-center"
        style={{
          width: captureSize.width,
          height: captureSize.height,
          margin: `${(size.height - captureSize.height) / 2}px ${(size.width - captureSize.width) / 2}px`,
        }}
        role="region"
        aria-label={`Virtual ${model.name}`}
      >
        <div
          className="relative shrink-0"
          style={{ width: size.width, height: size.height }}
        >
          <PhoneModel3D
            model={model}
            size={size}
            brightness={brightness}
            isOn={isOn}
            chargerPhase={chargerPhase}
            isFrontVisible
            currentScreen={currentScreen}
            showControlCenter={showControlCenter}
            showAppSwitcher={showAppSwitcher}
            ringingAlarmId={ringingAlarmId}
            onHardwareButton={onHardwareButton}
            onHardwareButtonRelease={onHardwareButtonRelease}
          >
            {children}
          </PhoneModel3D>
        </div>
      </div>
    </div>
  );
};

export default VirtualIPhone;
