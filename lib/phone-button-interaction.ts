import * as THREE from "three";

export const HARDWARE_BUTTON_TARGET_WIDTH_PX = 32;
export const HARDWARE_BUTTON_TARGET_HEIGHT_PX = 44;

/** A stable, invisible target extends out from the resting button, so movement
 * of the visible metal cannot cause hover flicker or shrink the click area. */
export function createHardwareButtonHitArea(
  button: THREE.Mesh,
  mmPerPixel: number,
): THREE.Mesh {
  const bounds = new THREE.Box3().setFromObject(button);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const side = center.x < 0 ? -1 : 1;
  const width = Math.max(size.x, HARDWARE_BUTTON_TARGET_WIDTH_PX * mmPerPixel);
  const height = Math.max(
    size.y + 8 * mmPerPixel,
    HARDWARE_BUTTON_TARGET_HEIGHT_PX * mmPerPixel,
  );
  const target = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, Math.max(size.z, 12 * mmPerPixel)),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  );
  // Keep 6px of overlap with the real button and offer the rest outside it.
  center.x =
    (side < 0 ? bounds.min.x : bounds.max.x) +
    side * (width / 2 - 6 * mmPerPixel);
  target.position.copy(center);
  target.name = `${button.name}-hit-area`;
  return target;
}

export function getHardwareButtonOffset(
  side: -1 | 1,
  hovered: boolean,
  pressed: boolean,
  mmPerPixel: number,
): number {
  if (!hovered && !pressed) return 0;
  // A press depresses a raised button; a touch press retains the original inset.
  return side * ((hovered ? 6 : 0) - (pressed ? 3 : 0)) * mmPerPixel;
}
