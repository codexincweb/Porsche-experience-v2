import * as THREE from "three";
import { FRAME_COUNT, FRAME_ASPECT, frameUrl } from "../config/frames.js";

// Draws the frame sequence as a full-screen layer. It blends two neighbouring
// frames for smooth scrubbing, lays the portrait footage out for any screen
// (cover on phones, centred with a soft blurred backdrop on wide screens),
// and can repaint the car's body colour on the GPU.

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform vec2 uView;
uniform float uFrameAspect;
uniform float uCx;
uniform float uZoom;
uniform vec2 uFocus;
uniform float uFade;
uniform float uTime;
uniform vec3 uPaint;
uniform float uPaintOn;
uniform float uMatte;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

// The paint in the footage is a saturated yellow. Pixels in that hue band
// take the chosen colour; highlights, glass, tyres and the studio keep theirs.
vec3 repaint(vec3 c) {
  if (uPaintOn < 0.5) return c;
  vec3 h = rgb2hsv(c);
  float mh = 1.0 - smoothstep(0.055, 0.115, abs(h.x - 0.135));
  float m = mh * smoothstep(0.13, 0.34, h.y) * smoothstep(0.05, 0.16, h.z);
  vec3 t = rgb2hsv(uPaint);
  float s = clamp(h.y * t.y / 0.85, 0.0, 1.0);
  float v = h.z * clamp(t.z / 0.92, 0.0, 1.6);
  v = mix(v, v * 0.78 + 0.05, uMatte);
  s = mix(s, s * 0.9, uMatte);
  return mix(c, hsv2rgb(vec3(t.x, s, clamp(v, 0.0, 1.0))), m);
}

vec3 grab(vec2 uv) {
  vec3 a = texture2D(uA, uv).rgb;
  if (uMix < 0.002) return a;
  return mix(a, texture2D(uB, uv).rgb, uMix);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float sa = uView.x / uView.y;
  float wH = uFrameAspect / sa; // frame width as a share of the screen when it fills the height
  float cx = mix(0.5, uCx, 1.0 - smoothstep(0.7, 1.0, wH));

  // Foreground: the frame fills the screen height (zoomed), centred on cx.
  vec2 d = vec2(vUv.x - cx, vUv.y - 0.5);
  float fu = uFocus.x + d.x / (uZoom * wH);
  float fv = uFocus.y + d.y / uZoom; // up-positive
  vec2 fuv = vec2(fu, 1.0 - fv);
  float inside = step(0.0, fu) * step(fu, 1.0);
  float feather = smoothstep(0.0, 0.07, fu) * smoothstep(1.0, 0.93, fu);
  vec3 fg = grab(clamp(fuv, 0.0, 1.0));

  // Backdrop: the same frame stretched to cover the screen, blurred and dimmed.
  vec3 bg = vec3(0.0);
  float cover = max(1.0, sa / uFrameAspect);
  vec2 buv = vec2(vUv.x, 1.0 - (uFocus.y + (vUv.y - 0.5) / cover));
  buv.x = 0.5 + (vUv.x - 0.5) / max(1.0, uFrameAspect / sa);
  if (wH < 1.0) {
    // A ring of taps, rotated per pixel so the blur reads as soft noise, not copies.
    float r = 0.04;
    float rot = hash(vUv * uView) * 6.2831853;
    for (int i = 0; i < TAPS; i++) {
      float a = rot + float(i) * 6.2831853 / float(TAPS);
      float rr = r * (0.55 + 0.45 * fract(float(i) * 0.618 + rot));
      bg += grab(clamp(buv + vec2(cos(a), sin(a)) * rr * vec2(1.0, 0.55), 0.0, 1.0));
    }
    bg /= float(TAPS);
    float g = dot(bg, vec3(0.299, 0.587, 0.114));
    bg = mix(vec3(g), bg, 0.7) * 0.42;
  }

  fg = repaint(fg);
  bg = repaint(bg);
  float w = (wH < 1.0) ? inside * feather : 1.0;
  vec3 col = mix(bg, fg, w);

  // Soft vignette, and a fade at the very bottom where the footage was cropped.
  vec2 q = (vUv - 0.5) * vec2(min(sa, 1.6), 1.0);
  col *= 1.0 - 0.38 * smoothstep(0.35, 1.05, length(q));
  col *= mix(0.0, 1.0, smoothstep(0.0, 0.1, vUv.y));
  // A little grain keeps the upscaled footage from looking waxy.
  col += (hash(vUv * uView + fract(uTime)) - 0.5) * 0.022;

  gl_FragColor = vec4(mix(vec3(0.031, 0.035, 0.043), col, uFade), 1.0);
}
`;

const hexToRgb = (hex) => {
  const c = { r: 0, g: 0, b: 0 };
  new THREE.Color(hex).getRGB(c, THREE.SRGBColorSpace); // raw sRGB values, like the textures
  return [c.r, c.g, c.b];
};

export class FrameLayer {
  constructor(renderer, { taps = 12 } = {}) {
    this.renderer = renderer;
    this.textures = [];
    this.ready = false;
    this.set = "m";
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.uniforms = {
      uA: { value: null },
      uB: { value: null },
      uMix: { value: 0 },
      uView: { value: new THREE.Vector2(1, 1) },
      uFrameAspect: { value: FRAME_ASPECT },
      uCx: { value: 0.62 },
      uZoom: { value: 1 },
      uFocus: { value: new THREE.Vector2(0.5, 0.5) },
      uFade: { value: 0 },
      uTime: { value: 0 },
      uPaint: { value: new THREE.Vector3(1, 1, 1) },
      uPaintOn: { value: 0 },
      uMatte: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      defines: { TAPS: taps },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  // Fetches and decodes every frame, then uploads them to the GPU a few at a
  // time so the loading screen stays responsive. Resolves to true on success.
  async load(set, onProgress) {
    this.set = set;
    const total = FRAME_COUNT;
    const bitmaps = new Array(total);
    let done = 0;
    let next = 0;
    const worker = async () => {
      while (next < total) {
        const i = next++;
        const res = await fetch(frameUrl(set, i));
        if (!res.ok) throw new Error(`frame ${i}: HTTP ${res.status}`);
        const blob = await res.blob();
        bitmaps[i] = typeof createImageBitmap === "function" ? await createImageBitmap(blob) : await blobToImage(blob);
        done++;
        onProgress?.((done / total) * 0.8);
      }
    };
    try {
      await Promise.all(Array.from({ length: 6 }, worker));
    } catch (e) {
      console.warn("[FrameLayer] could not load the frames", e);
      return false;
    }

    this.bitmaps = bitmaps;
    for (let i = 0; i < total; i++) {
      const t = new THREE.Texture(bitmaps[i]);
      t.colorSpace = THREE.NoColorSpace; // raw sRGB values in, raw values out
      t.flipY = false;
      t.generateMipmaps = false;
      t.minFilter = t.magFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      this.textures.push(t);
      this.renderer.initTexture(t);
      if (i % 6 === 5) {
        onProgress?.(0.8 + ((i + 1) / total) * 0.2);
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
    }
    this.ready = true;
    return true;
  }

  // Frame to analyse for the particle car (decoded pixels).
  frameImage(i) {
    return this.bitmaps?.[Math.round(i)] ?? null;
  }

  // Position is a float frame index; neighbours are cross-faded.
  setFrame(pos, pos2 = null, mix2 = 0) {
    if (!this.ready) return;
    const last = FRAME_COUNT - 1;
    if (pos2 !== null && mix2 > 0.001) {
      this.uniforms.uA.value = this.textures[Math.round(Math.min(last, Math.max(0, pos)))];
      this.uniforms.uB.value = this.textures[Math.round(Math.min(last, Math.max(0, pos2)))];
      this.uniforms.uMix.value = mix2;
      return;
    }
    const p = Math.min(last, Math.max(0, pos));
    const i = Math.floor(p);
    const f = p - i;
    this.uniforms.uA.value = this.textures[i];
    this.uniforms.uB.value = this.textures[Math.min(last, i + 1)];
    this.uniforms.uMix.value = f;
  }

  setLayout({ cx, zoom, fx = 0.5, fy = 0.5 }) {
    this.uniforms.uCx.value = cx;
    this.uniforms.uZoom.value = zoom;
    this.uniforms.uFocus.value.set(fx, fy);
  }

  setPaint(hex, matte = 0) {
    if (!hex) {
      this.uniforms.uPaintOn.value = 0;
      this.uniforms.uMatte.value = 0;
      return;
    }
    const [r, g, b] = hexToRgb(hex);
    this.uniforms.uPaint.value.set(r, g, b);
    this.uniforms.uPaintOn.value = 1;
    this.uniforms.uMatte.value = matte;
  }

  setSize(w, h) {
    this.uniforms.uView.value.set(w, h);
  }

  // Where the frame lands on screen for a given layout, for aligning the
  // particle car to it. Returns a function from frame uv (v down) to NDC.
  mapper({ cx, zoom, fx = 0.5, fy = 0.5 }) {
    const v = this.uniforms.uView.value;
    const sa = v.x / v.y;
    const wH = FRAME_ASPECT / sa;
    const t = clamp01((wH - 0.7) / 0.3);
    const centre = 0.5 + (cx - 0.5) * (1 - t * t * (3 - 2 * t));
    return (fu, fvDown) => {
      const sx = centre + (fu - fx) * zoom * wH;
      const sy = 0.5 + (1 - fvDown - fy) * zoom;
      return [sx * 2 - 1, sy * 2 - 1];
    };
  }

  render(renderer, { time, fade }) {
    if (!this.ready) return;
    this.uniforms.uTime.value = time;
    this.uniforms.uFade.value = fade;
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.textures.forEach((t) => t.dispose());
    this.bitmaps?.forEach((b) => b?.close?.());
    this.material.dispose();
    this.mesh.geometry.dispose();
    this.textures = [];
    this.ready = false;
  }
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
