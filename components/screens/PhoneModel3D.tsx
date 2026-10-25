"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";
import AlarmRingOverlay from "@/components/screens/clock/AlarmRingOverlay";
import TimerRingBanner from "@/components/screens/clock/TimerRingBanner";
import AppSwitcher from "@/components/screens/AppSwitcher";
import ControlCenter from "@/components/screens/ControlCenter";
import HomeIndicator from "@/components/screens/HomeIndicator";
import PhoneTopBar from "@/components/screens/PhoneTopBar";
import VolumeHud from "@/components/screens/VolumeHud";
import {
  getIPhoneDisplayMetrics,
  type IPhoneModel,
  type PreviewSize,
} from "@/lib/iphone-models";
import {
  getPhoneDisplayCornerRadii,
  getPhoneRenderSize,
  getPhoneSafeAreaInsets,
  PHONE_SCREEN_INSET_MM,
  getRearCameraGeometry,
} from "@/lib/phone-geometry";
import type { ChargerPhase } from "@/lib/battery";
import {
  isHardwareButtonId,
  VOLUME_BUTTON_SCREEN_TOP_RATIO,
  type HardwareButtonId,
} from "@/lib/phone-buttons";

import {
  createHardwareButtonHitArea,
  getHardwareButtonOffset,
} from "@/lib/phone-button-interaction";

const FRONT_FACE_BEVEL_MM = 0.9;
const FRONT_PANEL_RAISE_MM = 0.025;
const DISPLAY_SURFACE_GAP_MM = 0.015;

type PhoneModel3DProps = {
  model: IPhoneModel;
  size: PreviewSize;
  brightness: number;
  isOn: boolean;
  chargerPhase: ChargerPhase;
  isFrontVisible: boolean;
  currentScreen: string;
  showControlCenter: boolean;
  showAppSwitcher: boolean;
  ringingAlarmId: number | null;
  onHardwareButton: (button: HardwareButtonId) => void;
  onHardwareButtonRelease: (button: HardwareButtonId) => void;
  children: React.ReactNode;
};

const createRoundedShape = (
  width: number,
  height: number,
  radius: number,
): THREE.Shape => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + r, -halfHeight);
  shape.lineTo(halfWidth - r, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r);
  shape.lineTo(halfWidth, halfHeight - r);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight);
  shape.lineTo(-halfWidth + r, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r);
  shape.lineTo(-halfWidth, -halfHeight + r);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight);
  return shape;
};

const makeExtrudedPlate = (
  width: number,
  height: number,
  radius: number,
  depth: number,
  bevel: number,
): THREE.ExtrudeGeometry =>
  new THREE.ExtrudeGeometry(createRoundedShape(width, height, radius), {
    depth,
    bevelEnabled: bevel > 0,
    bevelSegments: 8,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 24,
    steps: 1,
  });

const addPlate = (
  parent: THREE.Group,
  dimensions: { width: number; height: number; x: number; y: number },
  material: THREE.Material,
  depth: number,
  z: number,
  radius: number,
  back = false,
) => {
  const geometry = makeExtrudedPlate(
    dimensions.width,
    dimensions.height,
    radius,
    depth,
    Math.min(0.45, depth * 0.2, radius * 0.18),
  );
  const plate = new THREE.Mesh(geometry, material);
  plate.position.set(back ? -dimensions.x : dimensions.x, dimensions.y, z);
  if (back) plate.rotation.y = Math.PI;
  parent.add(plate);
  return plate;
};

const addRing = (
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius: number,
  color: THREE.ColorRepresentation,
  back: boolean,
  tube = 0.7,
) => {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 10, 48),
    new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.82,
      roughness: 0.22,
      clearcoat: 0.6,
    }),
  );
  ring.position.set(back ? -x : x, y, z);
  if (back) ring.rotation.y = Math.PI;
  parent.add(ring);
};

const addLens = (
  parent: THREE.Group,
  point: { x: number; y: number },
  surfaceZ: number,
  radius: number,
  back: boolean,
  trimColor: string,
) => {
  const zSign = back ? -1 : 1;
  const x = back ? -point.x : point.x;
  const trim = new THREE.MeshPhysicalMaterial({
    color: trimColor,
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 0.8,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#07101d",
    metalness: 0.24,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.88, radius, 2.1, 48, 1),
    trim,
  );
  barrel.rotation.x = back ? -Math.PI / 2 : Math.PI / 2;
  barrel.position.set(x, point.y, surfaceZ + zSign * 0.95);
  parent.add(barrel);

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.72, 48),
    glass,
  );
  lens.position.set(x, point.y, surfaceZ + zSign * 2.05);
  if (back) lens.rotation.y = Math.PI;
  parent.add(lens);

  const reflection = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.16, 24),
    new THREE.MeshBasicMaterial({
      color: "#a9c9ee",
      transparent: true,
      opacity: 0.72,
    }),
  );
  reflection.position.set(
    x - zSign * radius * 0.26,
    point.y + radius * 0.25,
    surfaceZ + zSign * 2.09,
  );
  if (back) reflection.rotation.y = Math.PI;
  parent.add(reflection);
  addRing(
    parent,
    point.x,
    point.y,
    surfaceZ + zSign * 2.05,
    radius * 0.89,
    trimColor,
    back,
    0.45,
  );
};

const addSideButton = (
  parent: THREE.Group,
  side: -1 | 1,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: THREE.ColorRepresentation,
  buttonId: HardwareButtonId,
) => {
  const shape = createRoundedShape(
    width,
    height,
    Math.min(width / 2, height / 2),
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: 0.28,
    bevelThickness: 0.28,
    curveSegments: 16,
  });
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({ color, metalness: 0.85, roughness: 0.24 }),
  );
  mesh.rotation.y = (side * Math.PI) / 2;
  mesh.position.set(x, y, z);
  mesh.name = `hardware-button-${buttonId}`;
  mesh.userData.hardwareButtonId = buttonId;
  mesh.userData.basePositionX = x;
  parent.add(mesh);
  return mesh;
};

const addChargerCable = (parent: THREE.Group, height: number) => {
  const assembly = new THREE.Group();
  assembly.name = "virtual-charger-cable";
  assembly.visible = false;
  const plug = new THREE.Mesh(
    new THREE.BoxGeometry(8, 5.5, 3.2),
    new THREE.MeshPhysicalMaterial({
      color: "#33383e",
      metalness: 0.62,
      roughness: 0.28,
      clearcoat: 0.8,
    }),
  );
  plug.position.set(0, -height / 2 - 1.6, 0);
  assembly.add(plug);

  const collar = new THREE.Mesh(
    new THREE.BoxGeometry(8.8, 1.2, 4),
    new THREE.MeshPhysicalMaterial({
      color: "#9ca3aa",
      metalness: 0.86,
      roughness: 0.2,
    }),
  );
  collar.position.set(0, -height / 2 - 0.8, 0);
  assembly.add(collar);

  const cablePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -height / 2 - 3.5, 0),
    new THREE.Vector3(0, -height / 2 - 11, 1.5),
    new THREE.Vector3(2, -height / 2 - 20, 5),
    new THREE.Vector3(10, -height / 2 - 27, 7),
    new THREE.Vector3(18, -height / 2 - 28, 7),
  ]);
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(cablePath, 36, 1.15, 8, false),
    new THREE.MeshPhysicalMaterial({
      color: "#191c20",
      metalness: 0.12,
      roughness: 0.42,
    }),
  );
  assembly.add(cable);
  parent.add(assembly);
};

const addAppleLogo = (parent: THREE.Group, width: number, surfaceZ: number) => {
  const parsed = new THREE.ShapePath();
  parsed.moveTo(18.71, 19.5);
  parsed.bezierCurveTo(17.88, 20.74, 17, 21.95, 15.66, 21.97);
  parsed.bezierCurveTo(14.32, 22, 13.89, 21.18, 12.37, 21.18);
  parsed.bezierCurveTo(10.84, 21.18, 10.37, 21.95, 9.1, 22);
  parsed.bezierCurveTo(7.79, 22.05, 6.8, 20.68, 5.96, 19.47);
  parsed.bezierCurveTo(4.25, 17, 2.94, 12.45, 4.7, 9.39);
  parsed.bezierCurveTo(5.57, 7.87, 7.13, 6.91, 8.82, 6.88);
  parsed.bezierCurveTo(10.1, 6.86, 11.32, 7.75, 12.11, 7.75);
  parsed.bezierCurveTo(12.89, 7.75, 14.37, 6.68, 15.92, 6.84);
  parsed.bezierCurveTo(16.57, 6.87, 18.39, 7.1, 19.56, 8.82);
  parsed.bezierCurveTo(19.47, 8.88, 17.39, 10.1, 17.41, 12.63);
  parsed.bezierCurveTo(17.44, 15.65, 20.06, 16.66, 20.09, 16.67);
  parsed.bezierCurveTo(20.06, 16.74, 19.67, 18.11, 18.71, 19.5);
  parsed.moveTo(13, 3.5);
  parsed.bezierCurveTo(13.73, 2.67, 14.94, 2.04, 15.94, 2);
  parsed.bezierCurveTo(16.07, 3.17, 15.73, 4.35, 15.03, 5.19);
  parsed.bezierCurveTo(14.34, 6.04, 13.2, 6.7, 12.08, 6.61);
  parsed.bezierCurveTo(11.93, 5.46, 12.3, 4.26, 13, 3.5);
  const geometry = new THREE.ShapeGeometry(parsed.toShapes(), 12);
  geometry.center();
  geometry.scale(width / 22, width / 22, 1);
  const logo = new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({
      color: "#7f858a",
      metalness: 0.72,
      roughness: 0.28,
      side: THREE.DoubleSide,
    }),
  );
  logo.position.set(0, 0, surfaceZ);
  logo.rotation.y = Math.PI;
  parent.add(logo);
};

const disposeScene = (scene: THREE.Scene) => {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      if ("map" in material && material.map instanceof THREE.Texture)
        material.map.dispose();
      material.dispose();
    });
  });
};

const addDeviceGeometry = (
  scene: THREE.Scene,
  model: IPhoneModel,
  group: THREE.Group,
) => {
  const width = model.dimensionsMm.width;
  const height = model.dimensionsMm.height;
  const depth = model.dimensionsMm.depth;
  const halfDepth = depth / 2;
  const frontFaceBevel = FRONT_FACE_BEVEL_MM;
  const frontPanelInset = 0.8;
  const frontCornerRadius = width * 0.12 - frontPanelInset / 2;
  const frontPanelSurfaceZ = halfDepth + frontFaceBevel + FRONT_PANEL_RAISE_MM;
  const backColor =
    model.back.material === "ceramic-shield"
      ? "#dc7435"
      : model.back.material === "textured-matte-glass"
        ? "#aaa9a4"
        : "#287bab";
  const frameColor =
    model.back.material === "ceramic-shield"
      ? "#dd7938"
      : model.back.material === "textured-matte-glass"
        ? "#b9b7b1"
        : "#3e83a9";
  const frame = new THREE.MeshPhysicalMaterial({
    color: frameColor,
    metalness: 0.78,
    roughness: 0.26,
    clearcoat: 0.72,
  });
  const glassBack = new THREE.MeshPhysicalMaterial({
    color: backColor,
    metalness: 0.18,
    roughness: 0.34,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(
    makeExtrudedPlate(width, height, width * 0.12, depth, frontFaceBevel),
    frame,
  );
  body.position.z = -halfDepth;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  addPlate(
    group,
    {
      width: width - frontPanelInset,
      height: height - frontPanelInset,
      x: 0,
      y: 0,
    },
    new THREE.MeshPhysicalMaterial({
      color: "#050608",
      roughness: 0.14,
      metalness: 0.12,
      clearcoat: 1,
    }),
    0.12,
    frontPanelSurfaceZ - 0.12 - 0.024,
    frontCornerRadius,
  );

  const rearPanelWidth = width - 1.2;
  const rearPanelHeight = height - 1.2;
  addPlate(
    group,
    { width: rearPanelWidth, height: rearPanelHeight, x: 0, y: 0 },
    glassBack,
    0.12,
    -halfDepth - 0.04,
    width * 0.105,
    true,
  );

  const camera = getRearCameraGeometry(model);
  const plateauMaterial = new THREE.MeshPhysicalMaterial({
    color: backColor,
    metalness: model.back.material === "textured-matte-glass" ? 0.42 : 0.24,
    roughness: 0.28,
    clearcoat: 0.9,
    side: THREE.DoubleSide,
  });
  addPlate(
    group,
    { ...camera.plateau, y: camera.plateau.top - camera.plateau.height / 2 },
    plateauMaterial,
    model.back.cameraLayout === "pro-wide-plateau" ? 1.45 : 0.85,
    -halfDepth - 0.13,
    model.back.cameraLayout === "pro-wide-plateau"
      ? width * 0.09
      : width * 0.12,
    true,
  );
  if (model.back.cameraLayout === "pro-wide-plateau") {
    addPlate(
      group,
      {
        ...camera.cameraIsland,
        y: camera.cameraIsland.top - camera.cameraIsland.height / 2,
      },
      new THREE.MeshPhysicalMaterial({
        color: "#bd642f",
        metalness: 0.58,
        roughness: 0.24,
        clearcoat: 0.88,
      }),
      0.8,
      -halfDepth - 1.5,
      width * 0.075,
      true,
    );
  }

  const cameraSurface =
    halfDepth +
    0.13 +
    (model.back.cameraLayout === "pro-wide-plateau" ? 1.45 : 0.85) +
    (model.back.cameraLayout === "pro-wide-plateau" ? 0.8 : 0);
  for (const point of camera.lenses) {
    addLens(group, point, -cameraSurface, width * 0.067, true, "#c58a58");
  }
  const addSensor = (
    point: { x: number; y: number },
    radius: number,
    color: string,
  ) => {
    const sensor = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 1.15, 32),
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.35,
        roughness: 0.2,
        clearcoat: 0.9,
      }),
    );
    sensor.rotation.x = -Math.PI / 2;
    sensor.position.set(-point.x, point.y, -cameraSurface - 0.45);
    group.add(sensor);
    addRing(
      group,
      point.x,
      point.y,
      -cameraSurface - 1.05,
      radius * 0.9,
      "#bd8c67",
      true,
      0.3,
    );
  };
  addSensor(camera.flash, width * 0.032, "#fff4d2");
  if (camera.lidar) addSensor(camera.lidar, width * 0.022, "#23262a");

  addAppleLogo(group, width * 0.2, -halfDepth - 0.18);

  // Raised metal controls sit on the actual side walls of the same chassis.
  addSideButton(
    group,
    -1,
    -width / 2 + depth * 0.24,
    height * (0.5 - VOLUME_BUTTON_SCREEN_TOP_RATIO["volume-up"]),
    0,
    1.35,
    height * 0.075,
    depth * 0.48,
    frameColor,
    "volume-up",
  );
  addSideButton(
    group,
    -1,
    -width / 2 + depth * 0.24,
    height * (0.5 - VOLUME_BUTTON_SCREEN_TOP_RATIO["volume-down"]),
    0,
    1.35,
    height * 0.075,
    depth * 0.48,
    frameColor,
    "volume-down",
  );
  addSideButton(
    group,
    -1,
    -width / 2 + depth * 0.24,
    height * 0.38,
    0,
    1.35,
    height * 0.05,
    depth * 0.48,
    frameColor,
    "action",
  );
  addSideButton(
    group,
    1,
    width / 2 - depth * 0.24,
    height * 0.23,
    0,
    1.35,
    height * 0.09,
    depth * 0.48,
    frameColor,
    "side",
  );
  addSideButton(
    group,
    1,
    width / 2 - depth * 0.24,
    -height * 0.14,
    0,
    1.35,
    height * 0.12,
    depth * 0.48,
    frameColor,
    "camera-control",
  );

  // The bottom face carries a recessed USB-C port and two speaker grilles.
  const port = new THREE.Mesh(
    makeExtrudedPlate(10.5, 3.2, 1.55, 0.25, 0.1),
    new THREE.MeshPhysicalMaterial({
      color: "#06080a",
      metalness: 0.58,
      roughness: 0.24,
      emissive: "#38bdf8",
      emissiveIntensity: 0,
    }),
  );
  port.name = "virtual-charging-port";
  port.rotation.x = Math.PI / 2;
  port.position.set(0, -height / 2 + 0.025, 0);
  group.add(port);
  const grille = new THREE.MeshBasicMaterial({ color: "#111418" });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i += 1) {
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.16, 16),
        grille,
      );
      hole.position.set(side * (width * 0.28 + i * 2.1), -height / 2, 0);
      group.add(hole);
    }
  }
  const topMic = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.16, 16),
    grille,
  );
  topMic.position.set(0, height / 2, 0);
  group.add(topMic);
  addChargerCable(group, height);

  const ambient = new THREE.HemisphereLight("#ffffff", "#29313d", 2.2);
  scene.add(ambient);
  const key = new THREE.DirectionalLight("#fff4e4", 4.5);
  key.position.set(-width, height * 0.82, depth * 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#b8d5ff", 2.2);
  fill.position.set(width, -height * 0.3, depth * 4);
  scene.add(fill);
};

const PhoneModel3D = ({
  model,
  size,
  brightness,
  isOn,
  chargerPhase,
  isFrontVisible,
  currentScreen,
  showControlCenter,
  showAppSwitcher,
  ringingAlarmId,
  onHardwareButton,
  onHardwareButtonRelease,
  children,
}: PhoneModel3DProps) => {
  // Extra transparent render space keeps the complete handset and charger
  // cable inside both renderer viewports.
  const renderSize = getPhoneRenderSize(size, chargerPhase !== "disconnected");
  const hostRef = useRef<HTMLDivElement>(null);
  const deviceRef = useRef<THREE.Group | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const hardwareButtonActionRef = useRef(onHardwareButton);
  const hardwareButtonReleaseRef = useRef(onHardwareButtonRelease);
  useEffect(() => {
    hardwareButtonActionRef.current = onHardwareButton;
  }, [onHardwareButton]);
  useEffect(() => {
    hardwareButtonReleaseRef.current = onHardwareButtonRelease;
  }, [onHardwareButtonRelease]);
  const [screenTarget] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const target = document.createElement("div");
    target.className = "phone-display-surface";
    target.dataset.phoneScreen = "true";
    target.style.width = `${size.width}px`;
    target.style.height = `${size.height}px`;
    const cornerRadii = getPhoneDisplayCornerRadii(model, size);
    target.style.borderRadius = `${cornerRadii.horizontal}px / ${cornerRadii.vertical}px`;
    target.style.overflow = "hidden";
    target.style.background = "var(--phone-canvas)";
    return target;
  });
  const screenTargetRef = useRef(screenTarget);
  const fallbackMountRef = useRef<HTMLDivElement>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  useEffect(() => {
    const target = screenTargetRef.current;
    if (!target) return;
    target.style.width = `${size.width}px`;
    target.style.height = `${size.height}px`;
    const cornerRadii = getPhoneDisplayCornerRadii(model, size);
    target.style.borderRadius = `${cornerRadii.horizontal}px / ${cornerRadii.vertical}px`;
  }, [
    model.dimensionsMm.height,
    model.dimensionsMm.width,
    size.height,
    size.width,
  ]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !screenTarget) return;
    const width = model.dimensionsMm.width;
    const height = model.dimensionsMm.height;
    const depth = model.dimensionsMm.depth;
    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(
      32,
      renderSize.width / renderSize.height,
      0.1,
      1600,
    );
    camera.position.set(
      0,
      0,
      ((height * (renderSize.height / size.height)) /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) *
        1.025,
    );
    camera.lookAt(0, 0, 0);
    const device = new THREE.Group();
    addDeviceGeometry(scene, model, device);
    scene.add(device);
    const mmPerPixel = (height / size.height) * 1.025;
    const buttonTargets = new Map<THREE.Object3D, THREE.Mesh>();
    for (const child of [...device.children]) {
      if (
        !(child instanceof THREE.Mesh) ||
        !isHardwareButtonId(child.userData.hardwareButtonId)
      )
        continue;
      const target = createHardwareButtonHitArea(child, mmPerPixel);
      device.add(target);
      buttonTargets.set(target, child);
    }
    const hitAreas = [...buttonTargets.keys()];

    const screenWidth = width - PHONE_SCREEN_INSET_MM;
    const screenHeight = height - PHONE_SCREEN_INSET_MM;
    const screen = new CSS3DObject(screenTarget);
    screen.position.set(
      0,
      0,
      depth / 2 +
        FRONT_FACE_BEVEL_MM +
        FRONT_PANEL_RAISE_MM +
        DISPLAY_SURFACE_GAP_MM,
    );
    screen.scale.set(screenWidth / size.width, screenHeight / size.height, 1);
    screen.element.style.backfaceVisibility = "hidden";
    screen.element.style.pointerEvents = "auto";
    device.add(screen);

    let webgl: THREE.WebGLRenderer;
    try {
      webgl = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
      });
    } catch {
      disposeScene(scene);
      const fallbackFrame = window.requestAnimationFrame(() => {
        setWebglUnavailable(true);
      });
      return () => window.cancelAnimationFrame(fallbackFrame);
    }
    webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    webgl.setSize(renderSize.width, renderSize.height);
    webgl.outputColorSpace = THREE.SRGBColorSpace;
    webgl.toneMapping = THREE.ACESFilmicToneMapping;
    webgl.toneMappingExposure = 1.1;
    webgl.domElement.className = "absolute inset-0 h-full w-full";
    webgl.domElement.setAttribute("aria-hidden", "true");
    webgl.domElement.dataset.deviceControl = "true";
    host.append(webgl.domElement);

    const css3d = new CSS3DRenderer();
    css3d.setSize(renderSize.width, renderSize.height);
    css3d.domElement.className = "absolute inset-0 h-full w-full";
    css3d.domElement.style.overflow = "visible";
    css3d.domElement.style.pointerEvents = "none";
    host.append(css3d.domElement);

    const render = () => {
      webgl.render(scene, camera);
      css3d.render(scene, camera);
    };

    let hoveredButton: THREE.Mesh | null = null;
    let activeButton: THREE.Mesh | null = null;
    let activeButtonId: HardwareButtonId | null = null;
    let activePointerId: number | null = null;
    let repeatDelay: number | null = null;
    let repeatInterval: number | null = null;
    const pressAnimations = new Map<THREE.Mesh, number>();
    const updateButtonAppearance = (button: THREE.Mesh) => {
      const pressed = button === activeButton;
      const previousFrame = pressAnimations.get(button);
      if (previousFrame !== undefined)
        window.cancelAnimationFrame(previousFrame);
      const startX = button.position.x;
      const baseX: unknown = button.userData.basePositionX;
      if (typeof baseX !== "number") return;
      const endX =
        baseX +
        getHardwareButtonOffset(
          baseX < 0 ? -1 : 1,
          button === hoveredButton,
          pressed,
          mmPerPixel,
        );
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        button.position.x = endX;
        render();
        return;
      }
      const startedAt = performance.now();
      const duration = pressed ? 64 : 112;
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - (1 - progress) ** 3;
        button.position.x = startX + (endX - startX) * eased;
        render();
        if (progress < 1) {
          pressAnimations.set(button, window.requestAnimationFrame(animate));
        } else {
          pressAnimations.delete(button);
        }
      };
      pressAnimations.set(button, window.requestAnimationFrame(animate));
    };
    const setHoveredButton = (button: THREE.Mesh | null) => {
      if (button === hoveredButton) return;
      const previous = hoveredButton;
      hoveredButton = button;
      webgl.domElement.style.cursor = button ? "pointer" : "";
      if (previous) updateButtonAppearance(previous);
      if (button) updateButtonAppearance(button);
    };
    const pickButton = (event: PointerEvent): THREE.Mesh | null => {
      const bounds = webgl.domElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return null;
      const pointer = new THREE.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      device.updateWorldMatrix(true, true);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(hitAreas, false)[0];
      return hit ? (buttonTargets.get(hit.object) ?? null) : null;
    };
    const handleButtonPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && activePointerId === null)
        setHoveredButton(pickButton(event));
    };
    const handleButtonPointerLeave = () => setHoveredButton(null);
    const clearRepeat = () => {
      if (repeatDelay !== null) window.clearTimeout(repeatDelay);
      if (repeatInterval !== null) window.clearInterval(repeatInterval);
      repeatDelay = null;
      repeatInterval = null;
    };
    const finishButtonPress = () => {
      clearRepeat();
      const releasedButton = activeButton;
      activeButton = null;
      if (releasedButton) updateButtonAppearance(releasedButton);
      if (activeButtonId) {
        hardwareButtonReleaseRef.current(activeButtonId);
      }
      activeButtonId = null;
      activePointerId = null;
    };
    const handleButtonPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (activePointerId !== null) return;
      const hit = pickButton(event);
      if (!hit) return;
      const buttonId = hit.userData.hardwareButtonId;
      if (!isHardwareButtonId(buttonId)) return;

      event.preventDefault();
      event.stopPropagation();
      setHoveredButton(event.pointerType === "mouse" ? hit : null);
      activeButton = hit;
      activeButtonId = buttonId;
      activePointerId = event.pointerId;
      webgl.domElement.setPointerCapture(event.pointerId);
      updateButtonAppearance(hit);
      hardwareButtonActionRef.current(buttonId);
      if (buttonId === "volume-up" || buttonId === "volume-down") {
        repeatDelay = window.setTimeout(() => {
          repeatInterval = window.setInterval(
            () => hardwareButtonActionRef.current(buttonId),
            140,
          );
        }, 450);
      }
    };
    const handleButtonPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      event.preventDefault();
      event.stopPropagation();
      setHoveredButton(
        event.type === "pointerup" && event.pointerType === "mouse"
          ? pickButton(event)
          : null,
      );
      finishButtonPress();
    };
    const cancelButtonInteraction = () => {
      setHoveredButton(null);
      finishButtonPress();
    };
    const handleVisibilityChange = () => {
      if (document.hidden) cancelButtonInteraction();
    };
    window.addEventListener("blur", cancelButtonInteraction);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    webgl.domElement.addEventListener("pointermove", handleButtonPointerMove);
    webgl.domElement.addEventListener("pointerleave", handleButtonPointerLeave);
    webgl.domElement.addEventListener("pointerdown", handleButtonPointerDown);
    webgl.domElement.addEventListener("pointerup", handleButtonPointerUp);
    webgl.domElement.addEventListener("pointercancel", handleButtonPointerUp);
    webgl.domElement.addEventListener(
      "lostpointercapture",
      handleButtonPointerUp,
    );
    deviceRef.current = device;
    renderRef.current = render;
    render();

    let frame = 0;
    const observer = new ResizeObserver(() => {
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      camera.aspect = bounds.width / bounds.height;
      camera.updateProjectionMatrix();
      webgl.setSize(bounds.width, bounds.height);
      css3d.setSize(bounds.width, bounds.height);
      render();
    });
    observer.observe(host);
    frame = window.requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      cancelButtonInteraction();
      window.removeEventListener("blur", cancelButtonInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      webgl.domElement.removeEventListener(
        "pointermove",
        handleButtonPointerMove,
      );
      webgl.domElement.removeEventListener(
        "pointerleave",
        handleButtonPointerLeave,
      );
      webgl.domElement.removeEventListener(
        "pointerdown",
        handleButtonPointerDown,
      );
      webgl.domElement.removeEventListener("pointerup", handleButtonPointerUp);
      webgl.domElement.removeEventListener(
        "pointercancel",
        handleButtonPointerUp,
      );
      webgl.domElement.removeEventListener(
        "lostpointercapture",
        handleButtonPointerUp,
      );
      pressAnimations.forEach((animationFrame) =>
        window.cancelAnimationFrame(animationFrame),
      );
      disposeScene(scene);
      webgl.dispose();
      webgl.domElement.remove();
      css3d.domElement.remove();
      deviceRef.current = null;
      renderRef.current = null;
    };
  }, [
    model,
    renderSize.height,
    renderSize.width,
    size.height,
    size.width,
  ]);

  useEffect(() => {
    if (!webglUnavailable) return;
    const mount = fallbackMountRef.current;
    const target = screenTargetRef.current;
    if (!mount || !target) return;
    target.style.width = `${mount.clientWidth}px`;
    target.style.height = `${mount.clientHeight}px`;
    target.style.position = "absolute";
    target.style.left = "50%";
    target.style.top = "50%";
    target.style.transform = "translate(-50%, -50%)";
    target.style.filter = `brightness(${brightness})`;
    mount.append(target);
  }, [brightness, size.height, size.width, webglUnavailable]);

  useEffect(() => {
    const device = deviceRef.current;
    if (!device) return;
    const cable = device.getObjectByName("virtual-charger-cable");
    const port = device.getObjectByName("virtual-charging-port");
    const portMaterial =
      port instanceof THREE.Mesh &&
      port.material instanceof THREE.MeshPhysicalMaterial
        ? port.material
        : null;
    if (!cable) return;

    if (chargerPhase === "disconnected") {
      cable.visible = false;
      cable.position.y = 0;
      if (portMaterial) portMaterial.emissiveIntensity = 0;
      renderRef.current?.();
      return;
    }

    cable.visible = true;
    if (chargerPhase === "connected") {
      cable.position.y = 0;
      if (portMaterial) portMaterial.emissiveIntensity = 0.55;
      renderRef.current?.();
      return;
    }

    if (portMaterial) portMaterial.emissiveIntensity = 0.8;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cable.position.y = 0;
      renderRef.current?.();
      return;
    }

    const startedAt = performance.now();
    cable.position.y = -18;
    let frame = 0;
    const animateConnection = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 700);
      const eased = 1 - (1 - progress) ** 3;
      cable.position.y = -18 * (1 - eased);
      renderRef.current?.();
      if (progress < 1) frame = window.requestAnimationFrame(animateConnection);
    };
    frame = window.requestAnimationFrame(animateConnection);
    return () => window.cancelAnimationFrame(frame);
  }, [chargerPhase, model]);

  useEffect(() => {
    if (!screenTarget) return;
    const target = screenTargetRef.current;
    if (!target) return;
    target.style.filter = `brightness(${brightness})`;
    target.style.pointerEvents = isFrontVisible ? "auto" : "none";
    target.toggleAttribute("inert", !isFrontVisible);
    target.setAttribute("aria-hidden", String(!isFrontVisible));
  }, [brightness, isFrontVisible, screenTarget]);

  const fallbackFrameColor =
    model.back.material === "ceramic-shield"
      ? "#dc7435"
      : model.back.material === "textured-matte-glass"
        ? "#aaa9a4"
        : "#287bab";
  const displayMetrics = getIPhoneDisplayMetrics(model, size);
  const safeArea = getPhoneSafeAreaInsets(model, size);
  const screenStyle: React.CSSProperties &
    Record<"--phone-safe-area-top" | "--phone-safe-area-bottom", string> = {
    "--phone-safe-area-top": `${safeArea.top}px`,
    "--phone-safe-area-bottom": `${safeArea.bottom}px`,
  };
  return (
    <>
      <div
        ref={hostRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: `${(renderSize.width / size.width) * 100}%`,
          height: `${(renderSize.height / size.height) * 100}%`,
          filter: "drop-shadow(0 26px 28px rgba(0,0,0,.34))",
        }}
      >
        {webglUnavailable && (
          <div
            className="absolute inset-0 overflow-hidden rounded-[2.8rem] border border-white/35 p-[2%] shadow-xl"
            style={{
              background: `linear-gradient(145deg, ${fallbackFrameColor}, #111820)`,
            }}
          >
            <div
              ref={fallbackMountRef}
              className="relative h-full w-full overflow-hidden rounded-[2.35rem] bg-[var(--phone-canvas)]"
            />
          </div>
        )}
      </div>
      {screenTarget &&
        createPortal(
          <div
            data-phone-display="true"
            className="phone-screen-content relative h-full w-full overflow-hidden bg-[var(--phone-canvas)]"
            style={screenStyle}
          >
            {isOn && <PhoneTopBar model={model} size={size} />}
            {isOn && (
              <div
                id="phone-frame"
                className="relative h-full w-full overflow-hidden"
              >
                {showControlCenter && <ControlCenter />}
                {showAppSwitcher && <AppSwitcher />}
                <div className="relative h-full w-full" inert={showAppSwitcher}>
                  {children}
                </div>
                {ringingAlarmId && <AlarmRingOverlay />}
                <TimerRingBanner />
              </div>
            )}
            {isOn &&
              currentScreen !== "home" &&
              !["screen-shutdown", "screen-boot"].includes(currentScreen) && (
                <HomeIndicator metrics={displayMetrics} />
              )}
            {isOn && isFrontVisible && <VolumeHud />}
          </div>,
          screenTarget,
        )}
    </>
  );
};

export default PhoneModel3D;
