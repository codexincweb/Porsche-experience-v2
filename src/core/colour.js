import { PAINTS } from "../config/paints.js";

export const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const f = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}

// Keeps a sampled colour usable as paint: not pure black, not blown out.
export function paintSafe(hex) {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return toHex(...hslToRgb(h, s, Math.min(0.88, Math.max(0.07, l))));
}

export function nearestPaint(hex) {
  const [r, g, b] = hexToRgb(hex);
  let best = PAINTS[0];
  let bestD = Infinity;
  for (const p of PAINTS) {
    const [pr, pg, pb] = hexToRgb(p.hex);
    // Weighted RGB distance (redmean approximation).
    const rm = (r + pr) / 2;
    const d = (2 + rm / 256) * (r - pr) ** 2 + 4 * (g - pg) ** 2 + (2 + (255 - rm) / 256) * (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

// Average colour of a square around (cx, cy) in an ImageData.
export function averageAt(img, cx, cy, radius = 8) {
  const { width: w, height: h, data } = img;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = Math.max(0, cy - radius); y < Math.min(h, cy + radius + 1); y++) {
    for (let x = Math.max(0, cx - radius); x < Math.min(w, cx + radius + 1); x++) {
      const i = (y * w + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  return n ? toHex(r / n, g / n, b / n) : "#000000";
}

// Dominant colour: 4-bit histogram, favouring saturated buckets so a grey
// wall does not always win over the more interesting colour next to it.
export function dominantColour(img) {
  const { data } = img;
  const bins = new Map();
  for (let i = 0; i < data.length; i += 4 * 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    bins.set(key, e);
  }
  let best = null;
  let bestScore = -1;
  bins.forEach((e) => {
    const [, s, l] = rgbToHsl(e.r / e.n, e.g / e.n, e.b / e.n);
    const score = e.n * (0.35 + s) * (l > 0.06 && l < 0.94 ? 1 : 0.3);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  });
  return best ? toHex(best.r / best.n, best.g / best.n, best.b / best.n) : "#000000";
}
