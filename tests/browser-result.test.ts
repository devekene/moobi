import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BrowserResult from "@/components/screens/browser/BrowserResult";
import { normalizeTavilySearch } from "@/lib/browser-search";
import type { CustomSearchResultData } from "@/types";
const base = {
  title: "An interesting article",
  link: "https://example.com/story",
  snippet: "A concise description.",
};
const render = (result: CustomSearchResultData) =>
  renderToStaticMarkup(
    createElement(BrowserResult, { result, onOpen: () => {} }),
  );
describe("browser result identity", () => {
  it("shows a supplied name above the URL with the favicon and no arrow", () => {
    const html = render({
      ...base,
      siteName: "Example",
      favicon: "https://example.com/icon.png",
    });
    expect(html).toContain("<strong>Example</strong>");
    expect(html).toContain("<small>https://example.com/story</small>");
    expect(html.indexOf("<strong>")).toBeLessThan(html.indexOf("<small>"));
    expect(html).toContain('src="https://example.com/icon.png"');
    expect(html).toContain('alt=""');
    expect(html).not.toContain("<svg");
    expect(html).toContain(base.snippet);
  });
  it("falls back to the hostname and globe without unsafe image sources", () => {
    const html = render({ ...base, favicon: "javascript:alert(1)" });
    expect(html).toContain("<strong>example.com</strong>");
    expect(html).not.toContain("<img");
    expect(html).toContain("<svg");
  });
  it("carries safe favicon metadata through provider normalization", () => {
    const data = normalizeTavilySearch(
      {
        results: [
          {
            title: base.title,
            url: base.link,
            content: base.snippet,
            favicon: "https://example.com/icon.png",
            site_name: "Example",
          },
          {
            title: "Other",
            url: "https://other.example",
            favicon: "data:image/svg+xml,bad",
          },
        ],
      },
      "test",
    );
    expect(data.results[0].favicon).toBe("https://example.com/icon.png");
    expect(data.results[0].siteName).toBe("Example");
    expect(data.results[1].favicon).toBeUndefined();
    expect(data.results[1].siteName).toBeUndefined();
  });
});
