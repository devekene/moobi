import { describe, expect, it } from "vitest";
import {
  getAvailableIPhoneModels,
  getIPhoneDisplayMetrics,
  getModelPreviewSize,
  IPHONE_MODELS,
} from "@/lib/iphone-models";

describe("virtual iPhone catalog and viewport fit", () => {
  it("keeps verified model proportions in the preview size", () => {
    for (const model of IPHONE_MODELS) {
      const preview = getModelPreviewSize(model, { width: 1280, height: 900 });
      expect(preview.width / preview.height).toBeCloseTo(
        model.dimensionsMm.width / model.dimensionsMm.height,
      );
    }
  });

  it("keeps the distinct Apple rear camera layouts in the model catalog", () => {
    expect(
      IPHONE_MODELS.map(({ id, back }) => [
        id,
        back.cameraCount,
        back.cameraLayout,
      ]),
    ).toEqual([
      ["iphone-16", 2, "iphone-16-dual"],
      ["iphone-16-pro", 3, "pro-triple"],
      ["iphone-17-pro-max", 3, "pro-wide-plateau"],
    ]);
  });

  it("keeps model-specific Dynamic Island proportions in the model catalog", () => {
    expect(
      IPHONE_MODELS.map(({ id, front }) => [
        id,
        front.dynamicIsland.widthRatio,
        front.dynamicIsland.aspectRatio,
      ]),
    ).toEqual([
      ["iphone-16", 0.3, 3.4],
      ["iphone-16-pro", 0.3, 3.4],
      ["iphone-17-pro-max", 0.19, 2.3],
    ]);
  });

  it("scales all display geometry with the preview dimensions", () => {
    const model = IPHONE_MODELS[0];
    const reference = getIPhoneDisplayMetrics(model, {
      width: model.displayMetrics.referenceWidth,
      height: model.displayMetrics.referenceHeight,
    });
    const doubled = getIPhoneDisplayMetrics(model, {
      width: model.displayMetrics.referenceWidth * 2,
      height: model.displayMetrics.referenceHeight * 2,
    });

    expect(doubled.statusBarHeight).toBe(reference.statusBarHeight * 2);
    expect(doubled.dynamicIslandTop).toBe(reference.dynamicIslandTop * 2);
    expect(doubled.homeIndicatorBottom).toBe(reference.homeIndicatorBottom * 2);
  });

  it("offers only models that meet their minimum preview size", () => {
    const viewport = { width: 400, height: 700 };
    const available = getAvailableIPhoneModels(viewport);

    expect(available.length).toBeGreaterThan(0);
    for (const model of available) {
      const preview = getModelPreviewSize(model, viewport);
      expect(preview.width).toBeGreaterThanOrEqual(model.minimumPreview.width);
      expect(preview.height).toBeGreaterThanOrEqual(
        model.minimumPreview.height,
      );
    }
  });

  it("offers no model when the viewport cannot meet minimum size", () => {
    expect(getAvailableIPhoneModels({ width: 360, height: 480 })).toEqual([]);
  });
});
