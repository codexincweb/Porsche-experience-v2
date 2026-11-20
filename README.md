# Porsche Experience

An independent, scroll-driven study of the Porsche 911 GT3 RS. Ten chapters: Arrival, Design, Aerodynamics, Machine, Particle Experience, Cockpit, Configurator, Camera Experience, Drive, Final Showcase.

Not affiliated with, sponsored by or endorsed by Porsche AG. Porsche, 911 and GT3 RS are trademarks of Dr. Ing. h.c. F. Porsche AG.

## How the scene works

The scene is **real footage**: a 51-frame sequence of a yellow 911 GT3 RS shot in a studio (front, turn to side, headlight, wheel and brake, cockpit, top-down, wing, rear, exhaust, driving away). Scrolling plays the frames forward and backward, so the visitor scrubs the film with their thumb.

A WebGL layer on top of the footage does the interactive work:

- **Frame player**: two neighbouring frames are blended on the GPU for smooth scrubbing; large jumps dissolve instead of scrubbing. Portrait footage is laid out for any screen (fills the phone, centred with a soft blurred backdrop on wide screens).
- **Particles (chapter 5)**: the car is rebuilt from the pixels of a frame, each particle carrying its pixel's colour, simulated on the GPU. Pointer repels, Disintegrate / Reassemble, density slider.
- **Configurator (chapter 7)**: the yellow paint is recoloured by a shader (swatches, finishes) and the view buttons jump to front, 3/4, side, rear 3/4 and top shots. Dragging turns the car through the front-to-side shots.
- **Camera (chapter 8)**: point the camera at anything, tap a spot, and the car repaints in that colour. Pixels are read locally and never stored or sent. Denied or missing camera falls back to a photo picker.
- **Sound**: synthesised in the browser (no audio files), off until the visitor turns it on.

## Install and run

Requires Node 20+.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve dist/ locally
```

Deploy `dist/` to any static host (Vercel, Netlify, GitHub Pages). For a sub-path deployment set `base` in `vite.config.js`; asset URLs use `import.meta.env.BASE_URL`.

## Controls

| Input | Action |
| --- | --- |
| Scroll / swipe | Play the footage and move through the chapters |
| Arrow Left / Right | Previous / next chapter |
| Drag on the car (Particles, Configurator) | Turn the car / push the particles |
| Pointer | Pushes particles in chapter 5 |
| Chapter menu (mobile) / ticks (desktop) | Jump to a chapter |
| Sound button | Sound is off until you enable it |
| Quality menu | Auto, High, Balanced, Low |

## Architecture

```
src/
  config/       frames.js (which frames play in which chapter), chapters, paints, quality presets
  core/         store, ScrollController, DeviceQualityManager, colour maths, configurator actions
  audio/        SoundManager (synthesised ambient bed, UI cues, engine tone)
  gl/           Stage (renderer, per-chapter logic), FrameLayer (footage + repaint shader),
                ParticleEngine + imageTargets (particles from a frame), shaders/
  components/   React UI: intro, loading, HUD, chapter nav, one component per chapter
  styles/       global.css, experience.css
public/frames/  s/ (360 px, weak phones) and m/ (540 px, everything else), 51 WebP frames each
tools/          build-frames.py rebuilds public/frames from a folder of PNG frames
```

- **Scroll**: native document scroll. Each chapter is a tall section holding a sticky full-viewport pin. `ScrollController` turns scroll position into a continuous chapter value and writes it to CSS and the store. Scrolling is never locked after the intro.
- **Quality**: three tiers (particle counts and blur taps scale down) plus a frame-time governor and a manual override. Weak devices load the smaller frame set.
- **Fallbacks**: without WebGL a readable static version shows every chapter over a still from the footage; reduced motion is respected; missing footage shows a plain notice and the page still scrolls.

## Replacing the footage

See `docs/FOOTAGE.md`. In short: put new PNG frames in a folder, run `python tools/build-frames.py <folder>`, and update `src/config/frames.js` if the frame count or shots changed.

## Accessibility and SEO

Skip link, focus-visible styles, aria-live chapter announcements, keyboard navigation, reduced-motion support, descriptive meta and Open Graph tags, a `noscript` summary.

## Assets and licences

See `docs/ASSETS.md`. Specification figures and their sources: `docs/SPECS.md`. What was and was not tested: `docs/IMPLEMENTATION_REPORT.md`.
