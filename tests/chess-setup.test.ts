import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/screens/chess/GameContext", () => ({
  useGame: () => ({ startGame: vi.fn(), timeControl: 3, difficulty: "medium" }),
}));
import SplashScreen, {
  TimePicker,
} from "@/components/screens/chess/SplashScreen";

describe("Chess launch and time selection", () => {
  it("shows only the chosen time and level above Start Game", () => {
    const html = renderToStaticMarkup(
      createElement(SplashScreen, { onStart: vi.fn() }),
    );
    expect(html).toContain('aria-label="Choose time, currently 3 min"');
    expect(html).toContain('aria-label="Choose level, currently Club"');
    expect(html).toContain("Start Game");
    expect(html.match(/<button\b/g)).toHaveLength(3);
    expect(html).not.toContain("Set your pace");
    expect(html).not.toContain("15 + 10");
  });
  it("groups all reference time choices and labels increment semantics", () => {
    const html = renderToStaticMarkup(
      createElement(TimePicker, { value: "3+2", onChange: vi.fn() }),
    );
    for (const label of [
      "Bullet",
      "Blitz",
      "Rapid",
      "1 min",
      "1 + 1",
      "2 + 1",
      "3 min",
      "3 + 2",
      "5 min",
      "10 min",
      "15 + 10",
      "30 min",
      "Untimed",
    ])
      expect(html).toContain(label);
    expect(html).toContain(
      'aria-pressed="true" aria-label="3 minutes per player plus 2 seconds per move"',
    );
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain("seconds after each move");
  });
});
