/** Author-facing SDK types; the implementation lives only inside the sandbox. */
export interface MiniAppEnvironment {
  readonly theme: "light" | "dark";
  readonly tokens: Readonly<Record<string, string>>;
  readonly safeArea: { readonly top: number; readonly bottom: number };
  readonly reducedMotion: boolean;
}

export type MiniAppEvent =
  "environment" | "launch" | "pause" | "resume" | "back";
export interface MiniAppSDK {
  readonly ready: Promise<null>;
  getEnvironment(): MiniAppEnvironment | null;
  onEvent(
    listener: (event: MiniAppEvent, value?: MiniAppEnvironment) => void,
  ): () => void;
  readonly storage: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<null>;
    remove(key: string): Promise<null>;
  };
}
