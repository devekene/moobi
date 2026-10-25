export type IPhoneModel = {
  id: string;
  name: string;
  dimensionsMm: { width: number; height: number; depth: number };
  displayDiagonalInches: number;
  finish: string;
  front: {
    display: "dynamic-island";
    bezel: "standard" | "thin";
    dynamicIsland: { widthRatio: number; aspectRatio: number };
  };
  displayMetrics: {
    referenceWidth: number;
    referenceHeight: number;
    statusBarHeight: number;
    dynamicIslandTop: number;
    homeIndicatorBottom: number;
  };
  buttons: { action: boolean; cameraControl: boolean };
  back: {
    cameraCount: 2 | 3;
    cameraLayout: "iphone-16-dual" | "pro-triple" | "pro-wide-plateau";
    material: "color-infused-glass" | "textured-matte-glass" | "ceramic-shield";
  };
  minimumPreview: { width: number; height: number };
  source: string;
};

// Dimensions and identifying details are from Apple's technical specifications.
// The preview thresholds are Moobi's usability choices in CSS pixels.
export const IPHONE_MODELS = [
  {
    id: "iphone-16",
    name: "iPhone 16",
    dimensionsMm: { width: 71.6, height: 147.6, depth: 7.8 },
    displayDiagonalInches: 6.1,
    finish: "Aluminum and color-infused glass",
    front: {
      display: "dynamic-island",
      bezel: "standard",
      dynamicIsland: { widthRatio: 0.3, aspectRatio: 3.4 },
    },
    displayMetrics: {
      referenceWidth: 390,
      referenceHeight: 804,
      statusBarHeight: 36,
      dynamicIslandTop: 11,
      homeIndicatorBottom: 8,
    },
    buttons: { action: true, cameraControl: true },
    back: {
      cameraCount: 2,
      cameraLayout: "iphone-16-dual",
      material: "color-infused-glass",
    },
    minimumPreview: { width: 220, height: 450 },
    source: "https://support.apple.com/pt-br/121029",
  },
  {
    id: "iphone-16-pro",
    name: "iPhone 16 Pro",
    dimensionsMm: { width: 71.5, height: 149.6, depth: 8.25 },
    displayDiagonalInches: 6.3,
    finish: "Titanium and textured matte glass",
    front: {
      display: "dynamic-island",
      bezel: "thin",
      dynamicIsland: { widthRatio: 0.3, aspectRatio: 3.4 },
    },
    displayMetrics: {
      referenceWidth: 390,
      referenceHeight: 814,
      statusBarHeight: 36,
      dynamicIslandTop: 11,
      homeIndicatorBottom: 8,
    },
    buttons: { action: true, cameraControl: true },
    back: {
      cameraCount: 3,
      cameraLayout: "pro-triple",
      material: "textured-matte-glass",
    },
    minimumPreview: { width: 220, height: 450 },
    source: "https://support.apple.com/en-nz/121031",
  },
  {
    id: "iphone-17-pro-max",
    name: "iPhone 17 Pro Max",
    dimensionsMm: { width: 78, height: 163.4, depth: 8.75 },
    displayDiagonalInches: 6.9,
    finish: "Aluminum unibody with Ceramic Shield back",
    front: {
      display: "dynamic-island",
      bezel: "thin",
      dynamicIsland: { widthRatio: 0.19, aspectRatio: 2.3 },
    },
    displayMetrics: {
      referenceWidth: 390,
      referenceHeight: 817,
      statusBarHeight: 36,
      dynamicIslandTop: 11,
      homeIndicatorBottom: 8,
    },
    buttons: { action: true, cameraControl: true },
    back: {
      cameraCount: 3,
      cameraLayout: "pro-wide-plateau",
      material: "ceramic-shield",
    },
    minimumPreview: { width: 220, height: 450 },
    source: "https://support.apple.com/en-my/125091",
  },
] as const satisfies readonly IPhoneModel[];

export type IPhoneModelId = (typeof IPHONE_MODELS)[number]["id"];

export const isIPhoneModelId = (value: string): value is IPhoneModelId =>
  IPHONE_MODELS.some((model) => model.id === value);

export type PreviewViewport = { width: number; height: number };
export type PreviewSize = { width: number; height: number };
export type IPhoneDisplayMetrics = {
  statusBarHeight: number;
  dynamicIslandTop: number;
  homeIndicatorBottom: number;
  uiScale: number;
};

export const getIPhoneDisplayMetrics = (
  model: IPhoneModel,
  size: PreviewSize,
): IPhoneDisplayMetrics => {
  const scaleY = size.height / model.displayMetrics.referenceHeight;
  return {
    statusBarHeight: model.displayMetrics.statusBarHeight * scaleY,
    dynamicIslandTop: model.displayMetrics.dynamicIslandTop * scaleY,
    homeIndicatorBottom: model.displayMetrics.homeIndicatorBottom * scaleY,
    uiScale: size.width / model.displayMetrics.referenceWidth,
  };
};

export const getModelPreviewSize = (
  model: IPhoneModel,
  viewport: PreviewViewport,
): PreviewSize => {
  const availableWidth = Math.max(0, viewport.width - 32);
  const availableHeight = Math.max(0, viewport.height - 32);
  const aspect = model.dimensionsMm.width / model.dimensionsMm.height;
  const height = Math.min(640, availableHeight, availableWidth / aspect);
  return { width: height * aspect, height };
};

export const getAvailableIPhoneModels = (viewport: PreviewViewport) =>
  IPHONE_MODELS.filter((model) => {
    const size = getModelPreviewSize(model, viewport);
    return (
      size.width >= model.minimumPreview.width &&
      size.height >= model.minimumPreview.height
    );
  });
