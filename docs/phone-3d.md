# Virtual phone 3D rendering

The phone chassis, camera plateau, camera barrels and rings, controls, speaker grilles, and USB-C opening are rendered as Three.js geometry. CSS alone could not keep those parts at real relative depth while showing the raised camera hardware from arbitrary turntable angles.

The active mini-app remains live HTML on a CSS3D plane attached to the same Three.js device group. Rotating the model therefore moves the display and chassis together without remounting the app. If WebGL cannot initialize, the preview falls back to a static front view and disables the turntable controls.

Model geometry is a browser visual simulation based on each catalog model's dimensions and verified exterior layout. It is not a manufacturing drawing or a claim about the visitor's physical phone.

The side volume, Action, power, and Camera Control buttons are interactive 3D meshes. Pressing moves the selected button inward and release animates it back; holding a volume button repeats the adjustment. Volume and brightness are stored as virtual phone settings in this browser. Volume affects Moobi's music and gallery video, and Silent mode mutes those media elements without changing operating-system audio or physical device state. The settings strip provides keyboard-accessible volume and Silent mode controls, while the phone power control remains available there as well. Camera Control opens the registered camera preview screen, which is currently marked unavailable.
