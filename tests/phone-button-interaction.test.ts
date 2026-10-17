import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  createHardwareButtonHitArea,
  getHardwareButtonOffset,
} from "@/lib/phone-button-interaction";

function makeButton(side: -1 | 1) {
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 8, 2),
    new THREE.MeshBasicMaterial(),
  );
  button.position.set(side * 36, 30, 0);
  return button;
}

function hitAt(target: THREE.Object3D, x: number, y: number) {
  target.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, y, 100),
    new THREE.Vector3(0, 0, -1),
  );
  return ray.intersectObject(target, true).length > 0;
}

describe("external phone button hit areas", () => {
  for (const side of [-1, 1] as const) {
    it(`accepts near misses outside the ${side < 0 ? "left" : "right"} metal button`, () => {
      const button = makeButton(side);
      const target = createHardwareButtonHitArea(button, 0.25);
      // This point is 20 display pixels outside the button center.
      expect(hitAt(button, side * 41, 30)).toBe(false);
      expect(hitAt(target, side * 41, 30)).toBe(true);
      expect(hitAt(target, side * 55, 30)).toBe(false);
      expect(hitAt(target, 0, 30)).toBe(false);
    });
  }

  it("keeps at least 32 by 44 CSS pixels across different preview scales", () => {
    for (const mmPerPixel of [0.18, 0.25, 0.4, 0.6]) {
      const target = createHardwareButtonHitArea(makeButton(-1), mmPerPixel);
      const bounds = new THREE.Box3().setFromObject(target);
      const size = bounds.getSize(new THREE.Vector3());
      expect(size.x / mmPerPixel).toBeGreaterThanOrEqual(31.999);
      expect(size.y / mmPerPixel).toBeGreaterThanOrEqual(43.999);
    }
  });

  it("keeps targets still while the visible button protrudes or depresses", () => {
    const button = makeButton(-1);
    const target = createHardwareButtonHitArea(button, 0.25);
    const rest = target.position.clone();
    button.position.x += getHardwareButtonOffset(-1, true, false, 0.25);
    expect(target.position.equals(rest)).toBe(true);
    expect(hitAt(target, -41, 30)).toBe(true);
  });

  it("rotates the target with the handset", () => {
    const group = new THREE.Group();
    const target = createHardwareButtonHitArea(makeButton(1), 0.25);
    group.add(target);
    group.rotation.z = Math.PI / 2;
    group.updateWorldMatrix(true, true);
    const point = target.getWorldPosition(new THREE.Vector3());
    expect(hitAt(group, point.x, point.y)).toBe(true);
    expect(hitAt(group, target.position.x, target.position.y)).toBe(false);
  });

  it("moves outward on hover, depresses on press, and restores exactly on leave", () => {
    for (const side of [-1, 1] as const) {
      expect(getHardwareButtonOffset(side, true, false, 0.25)).toBe(side * 1.5);
      expect(getHardwareButtonOffset(side, true, true, 0.25)).toBe(side * 0.75);
      expect(getHardwareButtonOffset(side, false, true, 0.25)).toBe(
        side * -0.75,
      );
      expect(getHardwareButtonOffset(side, false, false, 0.25)).toBe(0);
    }
  });
});
