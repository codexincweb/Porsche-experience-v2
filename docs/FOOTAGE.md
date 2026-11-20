# Footage

The site plays `public/frames/`: 51 WebP frames in two sizes.

| Folder | Size | Used for |
| --- | --- | --- |
| `s/` | 360 x 536 | Weak phones (the Low quality tier) |
| `m/` | 540 x 804 | Everything else; the same frames at 1.5x with a light sharpen |

## Where the frames came from
Frames 0 to 50 were extracted from a vertical video (360 x 640) supplied by the project owner. The bottom 104 px of every frame is cropped off because the source carried an editor's "Default text" caption and a pink glow there.

Shots (0-based): 0-5 front still, 6-8 turn to 3/4, 9-12 side, 13-17 headlight, 18-22 wheel and brake, 23-27 cockpit, 28-32 top-down, 33-37 rear wing, 38-42 rear 3/4, 43-45 exhaust, 46-50 driving away.

Frames 43-47 show a licence plate that reads "www.chscthoone". That is part of the footage and is the creator's own mark.

## Which chapter plays what
`src/config/frames.js`, `CHAPTER_FRAMES`: the frame range scrubbed across each chapter. `VIEW_FRAMES` maps the configurator's view buttons to frames, `DRAG_RANGE` is what dragging turns through, `PARTICLE_FRAME` is the frame the particle car is built from, and `CHAPTER_CX` places the picture horizontally on wide screens so it clears the text.

## Replacing the footage
1. Extract frames from your video as PNG, in order (for example with ffmpeg: `ffmpeg -i video.mp4 -vf fps=5 frames/f-%03d.png`).
2. `pip install pillow`, then `python tools/build-frames.py frames --crop-bottom 0` (use the default 104 only for the original footage).
3. Update `src/config/frames.js` (`FRAME_COUNT`, `FRAME_ASPECT`, the chapter ranges and shot comments) to match the new footage.
4. Footage in the same yellow works with the repaint shader as is. Another paint colour needs the hue band in `FrameLayer.js` (`repaint`) adjusted.

## Quality limits
The supplied footage is small (360 x 640) and sampled at a low frame rate, so it is soft on large screens and the turn from front to side moves in visible steps. Higher-resolution footage with more frames (a 1080 x 1920 export at 15 to 24 frames per second) would look noticeably sharper and smoother with no code changes beyond `frames.js`; keep the total download in mind (about 25 KB per frame at 540 px).

## Rights
The footage is someone else's work. Publish it only if you have permission from its creator or owner.
