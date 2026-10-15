import {
  getIPhoneDisplayMetrics,
  type IPhoneModel,
  type PreviewSize,
} from "@/lib/iphone-models";

export const PHONE_RENDER_OVERSCAN = 1.24;
export const PHONE_CHARGER_OVERSCAN = 1.45;
export const PHONE_SCREEN_INSET_MM = 1.2;

export const getPhoneRenderSize = (
  size: PreviewSize,
  showCharger = false,
): PreviewSize => {
  const scale = showCharger ? PHONE_CHARGER_OVERSCAN : PHONE_RENDER_OVERSCAN;
  return { width: size.width * scale, height: size.height * scale };
};

export const getPhoneDisplayCornerRadii = (
  model: IPhoneModel,
  size: PreviewSize,
): { horizontal: number; vertical: number } => {
  const screenWidth = model.dimensionsMm.width - PHONE_SCREEN_INSET_MM;
  const screenHeight = model.dimensionsMm.height - PHONE_SCREEN_INSET_MM;
  const cornerRadiusMm =
    model.dimensionsMm.width * 0.12 - PHONE_SCREEN_INSET_MM / 2;
  return {
    horizontal: cornerRadiusMm / (screenWidth / size.width),
    vertical: cornerRadiusMm / (screenHeight / size.height),
  };
};

const PHONE_TOP_BAR_EDGE_CLEARANCE = 8;

/** Content insets in preview pixels, owned by the virtual display, not the browser device. */
export const getPhoneSafeAreaInsets = (
  model: IPhoneModel,
  size: PreviewSize,
) => {
  const metrics = getIPhoneDisplayMetrics(model, size);
  const islandHeight =
    (model.front.dynamicIsland.widthRatio * size.width) /
    model.front.dynamicIsland.aspectRatio;
  const statusRowTop = Math.max(
    0,
    metrics.dynamicIslandTop + islandHeight / 2 - metrics.statusBarHeight / 2,
  );
  return {
    top:
      Math.max(
        statusRowTop + metrics.statusBarHeight,
        metrics.dynamicIslandTop + islandHeight,
      ) +
      8 * metrics.uiScale,
    bottom: metrics.homeIndicatorBottom + 40 * metrics.uiScale,
  };
};

export const getPhoneTopBarSafeInset = (
  model: IPhoneModel,
  size: PreviewSize,
  statusRowTop: number,
  statusBarHeight: number,
  contentHeight: number,
  uiScale: number,
): number => {
  const { horizontal, vertical } = getPhoneDisplayCornerRadii(model, size);
  const contentTop = Math.max(
    0,
    statusRowTop + (statusBarHeight - contentHeight) / 2,
  );
  const distanceFromCornerCenter = Math.max(0, vertical - contentTop);
  const normalizedY = Math.min(1, distanceFromCornerCenter / vertical);
  const cornerInset = horizontal * (1 - Math.sqrt(1 - normalizedY ** 2));

  return cornerInset + PHONE_TOP_BAR_EDGE_CLEARANCE * uiScale;
};

export type Point3 = { x: number; y: number; z: number };
export type CameraGeometry = {
  plateau: { width: number; height: number; x: number; top: number };
  cameraIsland: { width: number; height: number; x: number; top: number };
  lenses: Point3[];
  flash: Point3;
  lidar: Point3 | null;
};

/**
 * Physical rear geometry in millimeters. The iPhone 17 Pro Max's plateau and
 * sensor centers follow the proportions in the supplied rear reference image;
 * other model layouts follow their Apple support illustrations.
 */
export const getRearCameraGeometry = (model: IPhoneModel): CameraGeometry => {
  const { width, height } = model.dimensionsMm;
  const left = -width / 2;
  const top = height / 2;

  if (model.back.cameraLayout === "iphone-16-dual") {
    const islandWidth = width * 0.32;
    const islandHeight = width * 0.53;
    const x = left + width * 0.06;
    const y = top - width * 0.06;
    return {
      plateau: {
        width: islandWidth,
        height: islandHeight,
        x: x + islandWidth / 2,
        top: y,
      },
      cameraIsland: {
        width: islandWidth,
        height: islandHeight,
        x: x + islandWidth / 2,
        top: y,
      },
      lenses: [
        { x: x + islandWidth * 0.48, y: y - islandHeight * 0.28, z: 0 },
        { x: x + islandWidth * 0.48, y: y - islandHeight * 0.72, z: 0 },
      ],
      flash: {
        x: x + islandWidth + width * 0.07,
        y: y - islandHeight * 0.2,
        z: 0,
      },
      lidar: null,
    };
  }

  if (model.back.cameraLayout === "pro-wide-plateau") {
    const plateauWidth = width * 0.94;
    const plateauHeight = width * 0.53;
    const x = -plateauWidth / 2;
    const y = top - width * 0.045;
    const islandWidth = width * 0.47;
    const islandHeight = width * 0.49;
    const islandX = x + width * 0.035;
    const islandY = y;
    const point = (px: number, py: number): Point3 => ({
      x: islandX + px * islandWidth,
      y: islandY - py * islandHeight,
      z: 0,
    });
    return {
      plateau: {
        width: plateauWidth,
        height: plateauHeight,
        x: 0,
        top: y,
      },
      cameraIsland: {
        width: islandWidth,
        height: islandHeight,
        x: islandX + islandWidth / 2,
        top: islandY,
      },
      lenses: [point(0.27, 0.24), point(0.69, 0.54), point(0.27, 0.78)],
      flash: { x: width * 0.36, y: y - plateauHeight * 0.22, z: 0 },
      lidar: { x: width * 0.36, y: y - plateauHeight * 0.77, z: 0 },
    };
  }

  const islandWidth = width * 0.4;
  const islandHeight = width * 0.4;
  const x = left + width * 0.055;
  const y = top - width * 0.05;
  const center = (px: number, py: number): Point3 => ({
    x: x + px * islandWidth,
    y: y - py * islandHeight,
    z: 0,
  });
  return {
    plateau: {
      width: islandWidth,
      height: islandHeight,
      x: x + islandWidth / 2,
      top: y,
    },
    cameraIsland: {
      width: islandWidth,
      height: islandHeight,
      x: x + islandWidth / 2,
      top: y,
    },
    lenses: [center(0.28, 0.27), center(0.7, 0.27), center(0.28, 0.7)],
    flash: center(0.72, 0.72),
    lidar: center(0.72, 0.27),
  };
};
