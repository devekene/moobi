import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { ScreenOptions } from "@/types";
import { LuX } from "react-icons/lu";
import { getAppMetadata } from "@/lib/app-registry";

const AppSwitcher = () => {
  const {
    history,
    currentScreen,
    setCurrentScreen,
    removeFromHistory,
    setShowAppSwitcher,
  } = usePhoneStore();

  // Combine the current screen with history, removing duplicates
  const allScreens = Array.from(
    new Set([...history, currentScreen].filter((s) => s !== "home")),
  );

  const handleDragEnd = (screen: ScreenOptions, info: PanInfo) => {
    if (info.offset.y < -100) {
      removeFromHistory(screen);

      if (screen === currentScreen && allScreens.length > 1) {
        setCurrentScreen("home");
      }

      if (allScreens.length === 1) {
        setShowAppSwitcher(false);
      }
    }
  };

  const handleAppClick = (screen: ScreenOptions) => {
    setCurrentScreen(screen);
    setShowAppSwitcher(false);
  };

  const handleCloseAll = () => {
    allScreens.forEach((screen) => {
      removeFromHistory(screen);
    });
    setCurrentScreen("home");
    setShowAppSwitcher(false);
  };

  return (
    <div className="relative min-h-screen bg-[var(--phone-canvas)] text-[var(--phone-text)]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={() => {
          setShowAppSwitcher(false);
          setCurrentScreen("home");
        }}
      >
        {/*Background Overlay*/}
        <div className="absolute inset-0 bg-[var(--phone-overlay)] backdrop-blur-xl" />

        {/* Opened Apps */}
        <div className="relative flex h-full w-full items-center justify-center px-4 py-20">
          {allScreens.length === 0 ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center text-white/70"
            >
              <p className="text-lg font-medium">No Recent Apps</p>
              <p className="mt-2 text-sm">Open an app to see it here</p>
            </motion.div>
          ) : (
            <div className="flex w-full flex-col items-center gap-3">
              {/* Scrollable App Cards */}
              <div className="hide-scrollbar flex max-w-full gap-4 overflow-x-auto px-4 pb-4">
                <AnimatePresence mode="popLayout">
                  {allScreens.map((screen, index) => {
                    const app = getAppMetadata(screen);
                    const Icon = app.icon;

                    return (
                      <motion.div
                        key={screen}
                        layout
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -100 }}
                        transition={{ delay: index * 0.05 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => handleDragEnd(screen, info)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${app.name}${app.availability === "preview" ? ", preview only" : ""}`}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleAppClick(screen);
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppClick(screen);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="group relative flex-shrink-0 cursor-pointer"
                        style={{
                          width: "180px",
                          height: "380px",
                        }}
                      >
                        {/* App Card */}
                        <div className="relative h-full w-full overflow-hidden rounded-3xl bg-[var(--phone-surface)] shadow-2xl">
                          <div
                            className="flex h-full w-full flex-col items-center justify-center"
                            style={{ backgroundColor: app.color }}
                          >
                            <div className="rounded-3xl bg-white/20 p-8 shadow-lg backdrop-blur-sm">
                              <Icon className="h-20 w-20 text-white drop-shadow-lg" />
                            </div>
                            <h3 className="mt-6 text-xl font-semibold text-white drop-shadow-md">
                              {app.name}
                            </h3>
                            {app.availability === "preview" && (
                              <span className="mt-2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
                                Preview only
                              </span>
                            )}
                          </div>

                          {/* Close Button (appears on hover) */}
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileHover={{ opacity: 1, scale: 1 }}
                            className="absolute left-4 top-4 rounded-full bg-red-500 p-2 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromHistory(screen);
                              if (
                                screen === currentScreen &&
                                allScreens.length > 1
                              ) {
                                const remainingScreens = allScreens.filter(
                                  (s) => s !== screen,
                                );
                                setCurrentScreen(
                                  remainingScreens[remainingScreens.length - 1],
                                );
                              }
                            }}
                          >
                            <LuX className="h-4 w-4" />
                          </motion.button>

                          {screen === "music-player" && (
                            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 transform gap-1">
                              <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{
                                  repeat: Number.POSITIVE_INFINITY,
                                  duration: 1.5,
                                }}
                                className="h-3 w-1 rounded-full bg-green-400"
                              />
                              <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{
                                  repeat: Number.POSITIVE_INFINITY,
                                  duration: 1.5,
                                  delay: 0.2,
                                }}
                                className="h-4 w-1 rounded-full bg-green-400"
                              />
                              <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{
                                  repeat: Number.POSITIVE_INFINITY,
                                  duration: 1.5,
                                  delay: 0.4,
                                }}
                                className="h-3 w-1 rounded-full bg-green-400"
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {allScreens.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseAll();
                  }}
                  className="flex-center w-32 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  Close All
                </motion.button>
              )}
            </div>
          )}
        </div>

        <style jsx>{`
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </motion.div>
    </div>
  );
};

export default AppSwitcher;
