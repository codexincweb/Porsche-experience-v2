#!/usr/bin/env python3
"""
Rebuilds the footage the site plays from a folder of PNG frames.

  pip install pillow
  python tools/build-frames.py path/to/png-frames [--crop-bottom 104]

Input   frames named so they sort in playing order (ezgif-frame-001.png ...).
Output  public/frames/s/f000.webp ...  native size, for weak phones
        public/frames/m/f000.webp ...  1.5x Lanczos + light sharpen, everything else

--crop-bottom removes a band from the bottom of every frame. The supplied
footage carried an editor's "Default text" caption there, so 104 px of the
640 px height are cut. Use 0 for clean footage.

If you change the number of frames or the shots, update src/config/frames.js
(FRAME_COUNT, FRAME_ASPECT, CHAPTER_FRAMES, VIEW_FRAMES ...) to match.
"""
import argparse, glob, os, sys
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("--out", default="public/frames")
ap.add_argument("--crop-bottom", type=int, default=104)
ap.add_argument("--quality-s", type=int, default=82)
ap.add_argument("--quality-m", type=int, default=80)
a = ap.parse_args()

files = sorted(glob.glob(os.path.join(a.src, "*.png")) + glob.glob(os.path.join(a.src, "*.jpg")))
if not files:
    sys.exit("no PNG/JPG frames found in " + a.src)
for d in ("s", "m"):
    os.makedirs(os.path.join(a.out, d), exist_ok=True)
    for old in glob.glob(os.path.join(a.out, d, "*.webp")):
        os.remove(old)

size_s = size_m = 0
for n, f in enumerate(files):
    im = Image.open(f).convert("RGB")
    w, h = im.size
    im = im.crop((0, 0, w, h - a.crop_bottom))
    ps = os.path.join(a.out, "s", f"f{n:03d}.webp")
    im.save(ps, "WEBP", quality=a.quality_s, method=6)
    big = im.resize((round(im.width * 1.5), round(im.height * 1.5)), Image.LANCZOS)
    big = big.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
    pm = os.path.join(a.out, "m", f"f{n:03d}.webp")
    big.save(pm, "WEBP", quality=a.quality_m, method=6)
    size_s += os.path.getsize(ps)
    size_m += os.path.getsize(pm)
print(f"{len(files)} frames, {im.width}x{im.height} native; s {size_s/1048576:.1f} MB, m {size_m/1048576:.1f} MB")
