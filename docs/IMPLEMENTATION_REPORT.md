# Implementation report

## Completed
- All ten chapters with real footage as the scene: scroll plays 51 frames of the car (front, turn, headlight, wheel and brake, cockpit, top-down, wing, rear, exhaust, driving away).
- Particle chapter built from the pixels of a footage frame, with pointer repulsion, Disintegrate / Reassemble and a density slider.
- Configurator: shader repaint of the yellow paint (eight swatches, four finishes), five view buttons that jump to filmed angles, drag to turn, Reset.
- Camera chapter: live camera colour sampling, tap to read a colour, dominant colour, repaint; graceful handling of denied or missing cameras; photo picker fallback.
- Intro, loading screen with real progress, sound toggle (off by default, visible), device and quality detection, manual quality menu.
- Native scroll with no post-intro lock, keyboard navigation, aria-live announcements, skip link, reduced motion, SEO and Open Graph tags.
- Static (no-WebGL) fallback that shows every chapter over a footage still; missing-footage fallback.
- README, docs, `tools/build-frames.py`.

## Tested
Automated in headless Chromium (software GL) against a development bundle built with esbuild, 52 checks, all passing:
- Enter, load all 51 frames and upload them as textures, every chapter activates while scrolling, scrolling plays frames forward (design 8 to 22, drive 46 to 50), arrow-key navigation, yellow car visible on arrival, sound toggle
- Particles: formed, pointer tracked, Disintegrate, Reassemble, density slider
- Configurator: swatch repaints (car goes red, yellow gone), finish, all five views land on their frames, drag turns the car, Reset restores yellow
- Camera with a fake device: off until asked, goes live, tap reads a colour, repaint, stops when leaving the chapter; denied permission (stubbed NotAllowedError) shows a plain message; photo fallback samples a colour
- Quality menu switches tiers and particle counts
- Missing footage: plain notice, page still scrolls; no WebGL: static layout, 10 of 10 headings, images load; reduced motion
- Phone viewport (390 px): no horizontal overflow in any chapter, tapping a swatch repaints
- No console errors in any run

## Not tested
- A real `npm install && npm run build` with Vite (npm was unavailable in the build environment)
- Real phones or the target low-end devices (HP Stream 11 Pro G5, TECNO KM4). Weak devices get the smaller frame set and lower particle counts, but frame rates are unmeasured
- Safari and Firefox
- Audible sound quality (the audio context was confirmed to start, not listened to)
- The live camera on a real device

## Known limits
- Footage resolution is low (360 x 640). It is soft on large screens; see `docs/FOOTAGE.md`.
- The front-to-side turn moves in visible steps because the source has few frames.
- The configurator recolours pixels in the yellow hue band. It cannot change what the footage did not film: only filmed angles exist, and reflections of the yellow garage lighting can tint slightly.
- The footage is not cleared for publication (see `docs/ASSETS.md`).
- Torque (465 Nm) and rev limit (9,000 rpm) are flagged in `docs/SPECS.md` to confirm against Porsche's press kit.

## How to run
`npm install`, then `npm run dev`. Build with `npm run build`.
