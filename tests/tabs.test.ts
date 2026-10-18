import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, type TabItem } from "@/components/ui/tabs";

const icon = createElement("svg", { "data-test-icon": true });

const renderTabs = (items: readonly TabItem[], value?: string) =>
  renderToStaticMarkup(
    createElement(Tabs, { items, value, label: "Example tabs" }),
  );

describe("glass tabs", () => {
  it("accepts an app active color while preserving caller styles", () => {
    const markup = renderToStaticMarkup(
      createElement(Tabs, {
        items: [{ value: "discover", label: "Discover", icon }],
        value: "discover",
        activeColor: "var(--phone-music-accent)",
        style: { height: "100%" },
      }),
    );
    expect(markup).toContain("--tabs-active-color:var(--phone-music-accent)");
    expect(markup).toContain("height:100%");
    expect(markup).not.toContain("activeColor=");
    expect(markup).toContain("var(--tabs-active-color,var(--phone-accent))");
  });

  it("renders labelled tabs and selects the first enabled item by default", () => {
    const markup = renderTabs([
      { value: "preview", label: "Preview", icon, disabled: true },
      { value: "home", label: "Home", icon },
    ]);
    const buttons = markup.match(/<button\b[^>]*>/g) ?? [];
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Example tabs"');
    expect(buttons[0]).toContain('disabled=""');
    expect(buttons[0]).toContain('data-state="inactive"');
    expect(buttons[1]).toContain('aria-selected="true"');
    expect(buttons[1]).toContain('data-state="active"');
  });

  it("uses the controlled value and connects the selected tab to its panel", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Tabs,
        {
          items: [
            { value: "home", label: "Home", icon },
            { value: "library", label: "Library", icon },
          ],
          value: "library",
        },
        createElement(TabsContent, { value: "library" }, "Library content"),
      ),
    );
    const buttons = markup.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons[0]).toContain('aria-selected="false"');
    expect(buttons[1]).toContain('aria-selected="true"');
    expect(buttons[1]).toContain("aria-controls=");
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain("Library content");
  });

  it("caps large badges visually while retaining the full count in the accessible label", () => {
    const markup = renderTabs([
      { value: "inbox", label: "Inbox", icon, badge: 120 },
    ]);
    expect(markup).toContain('aria-label="Inbox, 120"');
    expect(markup).toContain("99+");
  });

  it("hides empty and invalid badges and supports text badges", () => {
    const markup = renderTabs([
      { value: "zero", label: "Zero", icon, badge: 0 },
      { value: "negative", label: "Negative", icon, badge: -1 },
      { value: "empty", label: "Empty", icon, badge: " " },
      { value: "invalid", label: "Invalid", icon, badge: Number.NaN },
      { value: "news", label: "News", icon, badge: "New" },
    ]);
    expect(markup).not.toContain('aria-label="Zero,');
    expect(markup).not.toContain('aria-label="Negative,');
    expect(markup).not.toContain('aria-label="Empty,');
    expect(markup).not.toContain('aria-label="Invalid,');
    expect(markup).toContain('aria-label="News, New"');
  });

  it("does not render an empty tab bar", () => {
    expect(renderTabs([])).not.toContain('role="tablist"');
  });
});
