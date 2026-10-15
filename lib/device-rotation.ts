import type { PreviewSize } from "@/lib/iphone-models";

export type DeviceRotation = { pitch: number; yaw: number };
export type DeviceSurface =
  "front" | "back" | "top edge" | "bottom edge" | "left side" | "right side";

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const transformNormal = (
  normal: readonly [number, number, number],
  rotation: DeviceRotation,
): readonly [number, number, number] => {
  const pitch = toRadians(rotation.pitch);
  const yaw = toRadians(rotation.yaw);
  const [x, y, z] = normal;
  const pitchedY = y * Math.cos(pitch) - z * Math.sin(pitch);
  const pitchedZ = y * Math.sin(pitch) + z * Math.cos(pitch);
  return [
    x * Math.cos(yaw) + pitchedZ * Math.sin(yaw),
    pitchedY,
    -x * Math.sin(yaw) + pitchedZ * Math.cos(yaw),
  ];
};

const SURFACES: readonly {
  surface: DeviceSurface;
  normal: readonly [number, number, number];
}[] = [
  { surface: "front", normal: [0, 0, 1] },
  { surface: "back", normal: [0, 0, -1] },
  { surface: "top edge", normal: [0, 1, 0] },
  { surface: "bottom edge", normal: [0, -1, 0] },
  { surface: "left side", normal: [-1, 0, 0] },
  { surface: "right side", normal: [1, 0, 0] },
];

export const getVisibleDeviceSurface = (
  rotation: DeviceRotation,
): DeviceSurface => {
  let visibleSurface = SURFACES[0].surface;
  let greatestDepth = Number.NEGATIVE_INFINITY;

  for (const { surface, normal } of SURFACES) {
    const depth = transformNormal(normal, rotation)[2];
    if (depth > greatestDepth) {
      greatestDepth = depth;
      visibleSurface = surface;
    }
  }

  return visibleSurface;
};

export const getTurntableScale = (
  size: PreviewSize,
  depth: number,
  rotation: DeviceRotation,
  viewport: { width: number; height: number },
) => {
  const pitch = toRadians(rotation.pitch);
  const yaw = toRadians(rotation.yaw);
  const projectedWidth =
    Math.abs(Math.cos(yaw)) * size.width +
    Math.abs(Math.sin(yaw)) *
      (Math.abs(Math.sin(pitch)) * size.height +
        Math.abs(Math.cos(pitch)) * depth);
  const projectedHeight =
    Math.abs(Math.cos(pitch)) * size.height + Math.abs(Math.sin(pitch)) * depth;

  return Math.max(
    0.35,
    Math.min(
      1,
      Math.max(0, viewport.width - 48) / Math.max(projectedWidth, 1),
      Math.max(0, viewport.height - 188) / Math.max(projectedHeight, 1),
    ),
  );
};
