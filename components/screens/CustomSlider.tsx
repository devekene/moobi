import { Slider } from "@/components/ui/slider";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

type CustomSliderProps = {
  icon: IconType;
  value: number;
  onChange: (value: number) => void;
  label: string;
  iconColor: string;
  className?: string;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

const CustomSlider = ({
  icon: Icon,
  value,
  onChange,
  label,
  iconColor,
  className,
  onInteractionStart,
  onInteractionEnd,
}: CustomSliderProps) => {
  return (
    <div
      className={cn(
        `shadow-[ inset_0_1px_0_rgba(255,255,255,0.12), inset_0_-1px_0_rgba(0,0,0,0.06), 0_2px_6px_rgba(0,0,0,0.10) ] relative h-[125px] w-[56px] shrink-0 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.16] backdrop-blur-[24px] backdrop-saturate-[145%]`,
        className,
      )}
      onPointerDown={onInteractionStart}
      onPointerUp={onInteractionEnd}
      onPointerCancel={onInteractionEnd}
      onKeyDown={onInteractionStart}
      onKeyUp={onInteractionEnd}
    >
      {/* Filled portion */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--phone-control-center-slider)] transition-[height] duration-150 motion-reduce:transition-none"
        style={{
          height: `${Math.max(0, Math.min(100, value))}%`,
        }}
      />

      {/* Icon */}
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[13px] left-1/2 z-10 size-[18px] -translate-x-1/2"
        style={{
          color: iconColor,
        }}
      />

      <Slider
        aria-label={label}
        value={[value]}
        onValueChange={(nextValue) => {
          onChange(nextValue[0]);
        }}
        max={100}
        step={1}
        orientation="vertical"
        className="absolute inset-0 z-20 h-full w-full rounded-full focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        showThumb={false}
        showTrack={false}
        showRange={false}
      />
    </div>
  );
};

export default CustomSlider;
