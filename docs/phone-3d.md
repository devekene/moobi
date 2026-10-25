# Virtual phone 3D rendering

The phone chassis, camera plateau, camera barrels and rings, controls, speaker grilles, and USB-C opening are rendered as Three.js geometry. CSS alone could not keep those parts at credible relative depth while preserving the model-specific hardware.

The active mini-app remains live HTML on a CSS3D plane attached to the same Three.js device group. The device stays front-facing so the screen is always usable, with no turntable, reset, or presentation controls outside the phone. If WebGL cannot initialize, the preview falls back to a static front view.

Model geometry is a browser visual simulation based on each catalog model's dimensions and verified exterior layout. It is not a manufacturing drawing or a claim about the visitor's physical phone.

The side volume, Action, power, and Camera Control buttons are interactive 3D meshes. Pressing moves the selected button inward and release animates it back; holding a volume button repeats the adjustment. Volume and brightness are stored as virtual phone settings in this browser. Volume affects Moobi's music and gallery video, and Silent mode mutes those media elements without changing operating-system audio or physical device state. Settings provides keyboard-accessible volume, Silent mode, and virtual-model controls. Camera Control captures the rendered virtual display, downloads a PNG, and keeps an encrypted local copy in Gallery; it does not access the visitor's physical camera or photo library.
