// Turns one frame of the footage into particle targets: where each particle
// should sit (as a position in the frame) and the colour of the pixel it
// represents. Points are drawn where the car is: its paint and its edges.

const W = 180;

function rgb2hsv(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d + 6) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, mx > 0 ? d / mx : 0, mx];
}

export function buildTargets(image, count) {
  const iw = image.videoWidth || image.naturalWidth || image.width;
  const ih = image.videoHeight || image.naturalHeight || image.height;
  const H = Math.round((W * ih) / iw);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;

  const lum = new Float32Array(W * H);
  const paint = new Float32Array(W * H);
  let x0 = W;
  let x1 = 0;
  let y0 = H;
  let y1 = 0;
  for (let i = 0; i < W * H; i++) {
    const r = px[i * 4] / 255;
    const g = px[i * 4 + 1] / 255;
    const b = px[i * 4 + 2] / 255;
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const [h, s, v] = rgb2hsv(r, g, b);
    const yellow = Math.abs(h - 0.13) < 0.06 && s > 0.5 && v > 0.4 ? 1 : 0;
    paint[i] = yellow;
    if (yellow) {
      const x = i % W;
      const y = (i / W) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0 || y1 <= y0) return null;
  // The paint is reflected in the studio floor. Find the dark bumper band
  // between the car and its reflection and stop there.
  const rows = new Float32Array(H);
  for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) rows[y] += paint[y * W + x];
  const peak = Math.max(...rows);
  let carBottom = y1;
  for (let y = y0 + Math.round((y1 - y0) * 0.35); y <= y1 - 2; y++) {
    if (rows[y] < peak * 0.04 && rows[y + 1] < peak * 0.04 && rows[y + 2] < peak * 0.04) {
      carBottom = y;
      break;
    }
  }
  y1 = carBottom;
  // Grow the box a little to take in the grille, tyres and mirrors.
  const bw = x1 - x0;
  const bh = y1 - y0;
  x0 = Math.max(1, Math.floor(x0 - bw * 0.04));
  x1 = Math.min(W - 2, Math.ceil(x1 + bw * 0.04));
  y0 = Math.max(1, Math.floor(y0 - bh * 0.1));
  y1 = Math.min(H - 2, Math.ceil(y1 + bh * 0.14));

  // Weight each pixel: paint, plus edges (lights, grille, shut lines).
  const weight = new Float32Array(W * H);
  let total = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + W] - lum[i - W];
      const edge = Math.min(1, Math.hypot(gx, gy) * 3.2);
      const w = paint[i] * 3 + edge * 1.8 + (lum[i] < 0.22 ? 0.25 : 0);
      weight[i] = w;
      total += w;
    }
  }
  const cdf = new Float32Array(W * H);
  let acc = 0;
  for (let i = 0; i < W * H; i++) {
    acc += weight[i];
    cdf[i] = acc;
  }

  const uv = new Float32Array(count * 2);
  const colour = new Uint8Array(count * 4);
  for (let n = 0; n < count; n++) {
    const r = Math.random() * total;
    let lo = 0;
    let hi = W * H - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const x = lo % W;
    const y = (lo / W) | 0;
    uv[n * 2] = (x + Math.random()) / W;
    uv[n * 2 + 1] = (y + Math.random()) / H;
    const lift = 1.15;
    colour[n * 4] = Math.min(255, px[lo * 4] * lift);
    colour[n * 4 + 1] = Math.min(255, px[lo * 4 + 1] * lift);
    colour[n * 4 + 2] = Math.min(255, px[lo * 4 + 2] * lift);
    colour[n * 4 + 3] = 255;
  }
  return { uv, colour };
}
