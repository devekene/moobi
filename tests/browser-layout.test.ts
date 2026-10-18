import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Browser from "@/components/screens/browser";
import { getMiniApp } from "@/lib/app-registry";

describe("browser start page", () => {
  it("offers one directly editable address field without a duplicate search button", () => {
    const html = renderToStaticMarkup(createElement(Browser));
    expect(html.match(/<input\b/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Search or enter address"');
    expect(html).toContain('aria-label="Go"');
    expect(html).toContain('aria-label="Tabs, 1 open"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("Pick up where you left off");
    expect(html).not.toContain('<button type="button">Search or enter address');
  });
  it("owns its safe areas through the full-display app contract", () => {
    expect(getMiniApp("chrome-browser").viewport).toBe("full-bleed");
  });
});
