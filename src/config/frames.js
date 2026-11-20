import { BASE_URL } from "./model.js";

// The scene is a sequence of 51 frames of a yellow 911 GT3 RS shot in a studio.
// Frame numbers below are 0-based. The sequence is made of shots:
//   0-5 front, still      6-8 turning to 3/4     9-12 side
//   13-17 headlight       18-22 wheel and brake  23-27 cockpit
//   28-32 top-down        33-37 rear wing        38-42 rear 3/4
//   43-45 exhaust         46-50 driving away

export const FRAME_COUNT = 51;
export const FRAME_ASPECT = 360 / 536; // width / height of every frame

// Two sets of the same frames: "s" is the native 360 px size for weak phones,
// "m" is a 1.5x resampled set for everything else.
export const frameUrl = (set, i) => `${BASE_URL}frames/${set}/f${String(i).padStart(3, "0")}.webp`;

// The frame range played across each chapter, in chapter order. A range with
// a === b holds a still. null means the visitor drives it (configurator).
export const CHAPTER_FRAMES = [
  [0, 8], // 01 arrival: front, then the turn
  [8, 22], // 02 design: 3/4, side, headlight, wheel and brake
  [28, 42], // 03 aerodynamics: top-down, wing, rear 3/4
  [42.4, 45], // 04 machine: exhaust
  [2, 2], // 05 particles: rebuilt from this frame
  [23, 27], // 06 cockpit
  null, // 07 configurator
  null, // 08 camera
  [46, 50], // 09 drive: away from the camera
  [8, 8], // 10 showcase: front 3/4
];

// Configurator views and the frame each one shows.
export const VIEW_FRAMES = { front: 2, front34: 8, side: 11, rear34: 40, top: 30 };
// Dragging turns the car through the front-to-side shots.
export const DRAG_RANGE = [2, 12];

// Horizontal position of the frame (0..1) on wide screens, chosen per chapter
// to leave the text column clear.
export const CHAPTER_CX = [0.64, 0.64, 0.64, 0.68, 0.62, 0.36, 0.38, 0.38, 0.58, 0.74];

// Frame used as the source of the particle car, and the frame behind the
// static (no-WebGL) version of each chapter.
export const PARTICLE_FRAME = 2;
export const STATIC_FRAMES = [2, 8, 38, 44, 2, 25, 11, 11, 48, 8];
