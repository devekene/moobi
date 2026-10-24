import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AllMedia, {
  type GalleryTab,
} from "@/components/screens/gallery/AllMedia";
import { getMiniApp } from "@/lib/app-registry";

const renderGallery = (activeTab: GalleryTab) =>
  renderToStaticMarkup(
    createElement(AllMedia, {
      activeTab,
      capturedItems: [],
      favoriteIds: new Set(["may-5"]),
      galleryError: null,
      galleryStatus: "idle",
      onOpenMedia: vi.fn(),
      onTabChange: vi.fn(),
    }),
  );

describe("Gallery", () => {
  it("uses the full virtual display and removes search from its navigation", () => {
    expect(getMiniApp("gallery").viewport).toBe("full-bleed");
    const markup = renderGallery("library");
    expect(markup).toContain('aria-label="Gallery sections"');
    expect(markup).toContain("Library");
    expect(markup).toContain("Highlights");
    expect(markup).toContain("Albums");
    expect(markup).not.toContain("Search");
  });

  it("marks the visible section and provides named media actions", () => {
    const markup = renderGallery("library");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('aria-label="Open What was bro thinking?😂"');
    expect(markup).toContain('aria-label="Open Photo"');
  });

  it("renders complete Highlights and Albums destinations", () => {
    const highlights = renderGallery("highlights");
    expect(highlights).toContain("Little moments,");
    expect(highlights).toContain("Play memory");

    const albums = renderGallery("albums");
    expect(albums).toContain("All moments");
    expect(albums).toContain("Favorites");
    expect(albums).toContain("Videos");
  });

  it("renders virtual-phone screenshots in the Library", () => {
    const markup = renderToStaticMarkup(
      createElement(AllMedia, {
        activeTab: "library",
        capturedItems: [
          {
            id: "screenshot-1",
            type: "photo",
            thumbnail: "blob:screenshot-1",
            title: "Home screenshot",
            date: new Date("2026-10-24T12:00:00.000Z"),
            isFavorite: false,
          },
        ],
        favoriteIds: new Set<string>(),
        galleryError: null,
        galleryStatus: "idle",
        onOpenMedia: vi.fn(),
        onTabChange: vi.fn(),
      }),
    );
    expect(markup).toContain("From this virtual phone");
    expect(markup).toContain("Screenshots");
    expect(markup).toContain('aria-label="Open Home screenshot"');
    expect(markup).toContain("blob:screenshot-1");
  });
});
