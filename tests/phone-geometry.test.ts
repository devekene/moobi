import { describe, expect, it } from "vitest";
import { getIPhoneDisplayMetrics, IPHONE_MODELS } from "@/lib/iphone-models";
import {
  getPhoneDisplayCornerRadii,
  getPhoneRenderSize,
  getPhoneSafeAreaInsets,
  getPhoneTopBarSafeInset,
  getRearCameraGeometry,
  PHONE_CHARGER_OVERSCAN,
  PHONE_RENDER_OVERSCAN,
} from "@/lib/phone-geometry";

describe("3D phone rear geometry", () => {
  it("keeps the iPhone 16 pair vertical and its flash outside the camera island", () => {
    const model = IPHONE_MODELS.find(({ id }) => id === "iphone-16");
    if (!model) throw new Error("iPhone 16 model is missing");
    const rear = getRearCameraGeometry(model);

    expect(rear.lenses).toHaveLength(2);
    expect(rear.lenses[0].x).toBe(rear.lenses[1].x);
    expect(rear.lenses[0].y).toBeGreaterThan(rear.lenses[1].y);
    expect(rear.flash.x).toBeGreaterThan(
      rear.cameraIsland.x + rear.cameraIsland.width / 2,
    );
  });

  it("builds a raised full-width plateau with the 17 Pro Max lens cluster on its left", () => {
    const model = IPHONE_MODELS.find(({ id }) => id === "iphone-17-pro-max");
    if (!model) throw new Error("iPhone 17 Pro Max model is missing");
    const rear = getRearCameraGeometry(model);
    const leftLensCount = rear.lenses.filter(({ x }) => x < 0).length;

    expect(rear.plateau.width).toBeGreaterThan(model.dimensionsMm.width * 0.9);
    expect(rear.lenses).toHaveLength(3);
    expect(leftLensCount).toBe(3);
    expect(rear.lenses[1].y).toBeLessThan(rear.lenses[0].y);
    expect(rear.lenses[1].y).toBeGreaterThan(rear.lenses[2].y);
    expect(rear.flash.x).toBeGreaterThan(0);
    expect(rear.lidar?.x).toBeGreaterThan(0);
  });

  it("gives the 16 Pro a separate square three-camera plateau", () => {
    const model = IPHONE_MODELS.find(({ id }) => id === "iphone-16-pro");
    if (!model) throw new Error("iPhone 16 Pro model is missing");
    const rear = getRearCameraGeometry(model);
    const topRow = rear.lenses.filter(({ y }) => y > rear.lenses[2].y);

    expect(rear.lenses).toHaveLength(3);
    expect(rear.plateau.width).toBeCloseTo(rear.plateau.height);
    expect(topRow).toHaveLength(2);
    expect(rear.lidar).not.toBeNull();
  });
});

describe("3D phone presentation geometry", () => {
  it("keeps content below the island and above the home gesture region for every model", () => {
    for (const model of IPHONE_MODELS) {
      const size = {
        width: 390,
        height: (390 * model.dimensionsMm.height) / model.dimensionsMm.width,
      };
      const metrics = getIPhoneDisplayMetrics(model, size);
      const insets = getPhoneSafeAreaInsets(model, size);
      const islandBottom =
        metrics.dynamicIslandTop +
        (model.front.dynamicIsland.widthRatio * size.width) /
          model.front.dynamicIsland.aspectRatio;

      expect(insets.top).toBeGreaterThan(islandBottom);
      expect(insets.bottom).toBeGreaterThan(
        metrics.homeIndicatorBottom + 32 * metrics.uiScale,
      );
      expect(size.height - insets.top - insets.bottom).toBeGreaterThan(0);
    }
  });

  it("scales both safe areas with the virtual preview without using the browser device", () => {
    for (const model of IPHONE_MODELS) {
      const full = getPhoneSafeAreaInsets(model, { width: 390, height: 844 });
      const half = getPhoneSafeAreaInsets(model, { width: 195, height: 422 });
      expect(half.top).toBeCloseTo(full.top / 2);
      expect(half.bottom).toBeCloseTo(full.bottom / 2);
    }
  });

  it("adds renderer space around the unchanged phone display size", () => {
    const display = { width: 390, height: 844 };
    const render = getPhoneRenderSize(display);

    expect(render.width).toBe(display.width * PHONE_RENDER_OVERSCAN);
    expect(render.height).toBe(display.height * PHONE_RENDER_OVERSCAN);
    expect(getPhoneRenderSize(display, true).height).toBe(
      display.height * PHONE_CHARGER_OVERSCAN,
    );
  });

  it("sets display corners inside the physical rounded chassis corners", () => {
    for (const model of IPHONE_MODELS) {
      const size = {
        width: 390,
        height: (390 * model.dimensionsMm.height) / model.dimensionsMm.width,
      };
      const radii = getPhoneDisplayCornerRadii(model, size);

      expect(radii.horizontal).toBeGreaterThan(40);
      expect(radii.horizontal).toBeLessThan(50);
      expect(radii.horizontal).toBeCloseTo(radii.vertical, 0);
    }
  });

  it("derives a symmetric top bar inset from the rounded display corner", () => {
    for (const model of IPHONE_MODELS) {
      const size = { width: 260, height: 540 };
      const inset = getPhoneTopBarSafeInset(
        model,
        size,
        24,
        24,
        14,
        260 / model.displayMetrics.referenceWidth,
      );

      expect(inset).toBeGreaterThan(0);
      expect(inset).toBeLessThan(size.width / 4);
    }
  });
});
