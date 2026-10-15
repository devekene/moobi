import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LuBell } from "react-icons/lu";
import CustomSlider from "./CustomSlider";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { VOLUME_BUTTON_SCREEN_TOP_RATIO } from "@/lib/phone-buttons";

const VolumeHud = () => {
  const source = usePhoneSettingsStore((state) => state.volumeHudSource);
  const volume = usePhoneSettingsStore((state) => state.volume);
  const setVolume = usePhoneSettingsStore((state) => state.setVolume);
  const currentScreen = usePhoneStore((state) => state.currentScreen);
  const shouldReduceMotion = useReducedMotion();
  const isVisible = source !== null && currentScreen !== "screen-lock";
  const top =
    source === "volume-up" || source === "volume-down"
      ? `${VOLUME_BUTTON_SCREEN_TOP_RATIO[source] * 100}%`
      : "50%";

  return (
    <div className="pointer-events-none absolute inset-0 z-[1001] overflow-hidden">
      <AnimatePresence>
        {isVisible && (source === "volume-up" || source === "volume-down") && (
          <motion.div
            key={`volume-edge-${source}`}
            aria-hidden="true"
            className="absolute left-0 z-[59] h-10 w-2 rounded-r-full bg-[var(--phone-text)]/15"
            style={{ top }}
            initial={{ x: shouldReduceMotion ? -4 : -8, opacity: 0 }}
            animate={{ x: -4, opacity: 0.25 }}
            exit={{ x: shouldReduceMotion ? -4 : -8, opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.12,
              ease: "easeOut",
            }}
          />
        )}
        {isVisible && source && (
          <motion.div
            key={`volume-hud-${source}`}
            className="pointer-events-auto absolute left-2 -translate-y-1/2"
            style={{ top }}
            initial={{ x: shouldReduceMotion ? 0 : -64, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: shouldReduceMotion ? 0 : -64, opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease: "easeInOut" }}
          >
            <CustomSlider
              icon={LuBell}
              iconColor="var(--phone-control-center-volume)"
              label={`Virtual volume ${Math.round(volume)} percent`}
              value={volume}
              onChange={setVolume}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VolumeHud;
