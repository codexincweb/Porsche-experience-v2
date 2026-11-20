import * as THREE from "three";
import { PRESETS } from "../config/quality.js";
import { CHAPTERS } from "../config/chapters.js";
import { PAINTS } from "../config/paints.js";
import { CHAPTER_CX, CHAPTER_FRAMES, DRAG_RANGE, PARTICLE_FRAME, VIEW_FRAMES } from "../config/frames.js";
import { DeviceQualityManager, detectTier } from "../core/DeviceQualityManager.js";
import { store } from "../core/store.js";
import { clamp, damp, smoothstep, easeOutCubic } from "../core/math.js";
import { sound } from "../audio/SoundManager.js";
import { FrameLayer } from "./FrameLayer.js";
import { ParticleEngine } from "./ParticleEngine.js";
import { buildTargets } from "./imageTargets.js";

const CH = Object.fromEntries(CHAPTERS.map((c, i) => [c.id, i]));
const N = CHAPTERS.length;
const TOP_SPEED_KMH = 296; // seventh gear, Porsche press release
const HALF_H = 3; // scene units from the centre to the top of the screen (particle pass)
const BIG_JUMP = 2.6; // frames; a larger change dissolves instead of scrubbing
const MATTE = { gloss: 0, metallic: 0.06, satin: 0.3, matte: 0.6 };

// The scene is a sequence of real frames of a 911 GT3 RS drawn on the GPU by
// FrameLayer, with a GPU particle pass on top for the particle chapter. The
// scroll position picks the frame; the configurator and camera chapters
// repaint the car in the frame shader.
export class Stage {
  constructor(host, { reducedMotion = false } = {}) {
    this.host = host;
    this.reducedMotion = reducedMotion;
    this.scroll = null;
    this.time = 0;
    this.last = performance.now();
    this.raf = 0;
    this.listeners = new Set();
    this.metrics = { speed: 0, speedNorm: 0, chapter: 0, u: 0 };
    this.disposed = false;

    const tier = store.get().tier || detectTier();
    this.tier = tier;
    this.preset = PRESETS[tier];
    this.prScale = 1;

    // Throws when WebGL is unavailable; the caller shows the static fallback.
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, stencil: false, depth: false, powerPreference: "high-performance" });
    const r = this.renderer;
    r.autoClear = false;
    r.setClearColor(0x08090b, 1);
    host.appendChild(r.domElement);
    r.domElement.setAttribute("aria-hidden", "true");

    this.frames = new FrameLayer(r, { taps: tier === "performance" ? 8 : 12 });

    this.pscene = new THREE.Scene();
    this.pcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
    this.pcam.position.z = 6;
    this._buildParticles();

    // Frame state
    this.pos = 0; // frame currently shown (float)
    this.dissolve = null; // { from, to, t }
    this.viewPos = VIEW_FRAMES.front34; // configurator / camera chapter frame
    this.viewTarget = VIEW_FRAMES.front34;
    this.cx = CHAPTER_CX[0];
    this.zoomDrift = 1;
    this.exposure = 0;
    this.revealZoom = 1;
    this.reveal = { running: false, done: false, t: 0, dur: reducedMotion ? 0.9 : 3.0 };
    this.ch5zone = -1;
    this.config = null;
    this.targets = null;

    // Pointer state
    this.pointer = new THREE.Vector2();
    this._pw = new THREE.Vector3();
    this.pointerDown = false;
    this.pointerType = "mouse";
    this.dragLast = null;
    this._bindEvents();

    this.quality = new DeviceQualityManager(({ tier: t, pixelRatioScale }) => this.applyTier(t, pixelRatioScale));
    this.resize();
    this.start();
  }

  // ---- construction helpers -------------------------------------------------

  _buildParticles() {
    this.particles = new ParticleEngine(this.renderer, this.preset.particleSide, { reducedMotion: this.reducedMotion });
    if (this.particles.ok) {
      this.particles.setPixelRatio(this.renderer.getPixelRatio());
      this.particles.setHalf(HALF_H * this._aspect(), HALF_H);
      this.pscene.add(this.particles.points);
      store.set({ particleEngine: "ready" });
    } else {
      store.set({ particleEngine: "unsupported" });
    }
  }

  _aspect() {
    return Math.max(0.2, this.host.clientWidth / Math.max(1, this.host.clientHeight));
  }

  // ---- public API -----------------------------------------------------------

  attachScroll(sc) {
    this.scroll = sc;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Loads the frame sequence. Resolves to true when the scene is ready.
  async loadScene(onProgress) {
    store.set({ modelStatus: "loading" });
    const set = this.tier === "performance" ? "s" : "m";
    const ok = await this.frames.load(set, onProgress);
    if (this.disposed) return ok;
    if (!ok) {
      store.set({ modelStatus: "error" });
      return false;
    }
    this._prepareTargets();
    this.frames.setFrame(0);
    store.set({ modelStatus: "loaded", modelSupports: { paint: true, wheel: false, particles: this.particles?.ok && Boolean(this.targets) } });
    return true;
  }

  // Samples the particle car from the footage once, then places it for the
  // current screen.
  _prepareTargets() {
    if (!this.particles?.ok) return;
    const img = this.frames.frameImage(PARTICLE_FRAME);
    this.targets = img ? buildTargets(img, this.particles.count) : null;
    this._placeTargets();
  }

  _layoutFor(ch) {
    const portrait = this._aspect() < 0.75;
    const base = portrait ? 1 : 1.12;
    return { cx: CHAPTER_CX[ch], zoom: base, fx: 0.5, fy: portrait ? (ch === CH.cockpit ? 0.5 : 0.44) : 0.5 };
  }

  _placeTargets() {
    const t = this.targets;
    if (!t || !this.particles?.ok) return;
    const map = this.frames.mapper(this._layoutFor(CH.particles));
    const asp = this._aspect();
    const data = new Float32Array(this.particles.count * 4);
    for (let i = 0; i < this.particles.count; i++) {
      const [nx, ny] = map(t.uv[i * 2], t.uv[i * 2 + 1]);
      data[i * 4] = nx * HALF_H * asp;
      data[i * 4 + 1] = ny * HALF_H;
      data[i * 4 + 2] = (Math.random() - 0.5) * 0.12;
      data[i * 4 + 3] = 1;
    }
    this.particles.setTarget(data, t.colour);
  }

  startReveal() {
    const rv = this.reveal;
    if (rv.running) return;
    rv.running = true;
    rv.done = false;
    rv.t = 0;
    this.exposure = 0;
    this.revealZoom = this.reducedMotion ? 1 : 1.16;
  }

  replay() {
    this.reveal.done = false;
    this.reveal.running = false;
    this.particles?.scatter();
    this.config = null;
    this.frames.setPaint(null);
    this.startReveal();
  }

  setConfig(config) {
    const paint = config.customPaint ?? PAINTS.find((p) => p.id === config.paint)?.hex ?? null;
    this.frames.setPaint(paint, MATTE[config.finish] ?? 0);
  }

  setView(viewId) {
    const f = VIEW_FRAMES[viewId];
    if (f === undefined) return;
    this.viewTarget = f;
    if (Math.abs(f - this.viewPos) > BIG_JUMP) this.viewPos = f;
  }

  formParticles() {
    if (this.particles?.form()) store.set({ particleState: "formed" });
  }
  scatterParticles() {
    this.particles?.scatter();
    store.set({ particleState: "scattered" });
  }
  disintegrateParticles() {
    this.particles?.disintegrate();
    store.set({ particleState: "scattered" });
  }
  setDensity(v) {
    if (this.particles) this.particles.density = v;
    store.set({ density: v });
  }

  setTierMode(mode) {
    this.quality.setMode(mode);
  }

  applyTier(tier, prScale = 1) {
    if (this.disposed) return;
    const changed = tier !== this.tier;
    this.tier = tier;
    this.prScale = prScale;
    this.preset = PRESETS[tier];
    const taps = tier === "performance" ? 8 : 12;
    if (this.frames.material.defines.TAPS !== taps) {
      this.frames.material.defines.TAPS = taps;
      this.frames.material.needsUpdate = true;
    }
    this.resize();
    if (changed && this.particles) {
      const wasShown = this.particles.fadeTarget === 1;
      const mixTarget = this.particles.mixTarget;
      this.pscene.remove(this.particles.points);
      this.particles.dispose();
      this._buildParticles();
      this._prepareTargets();
      this.particles?.show(wasShown);
      if (mixTarget > 0.5) this.particles?.form();
      if (this.particles) this.particles.density = store.get().density;
    }
  }

  // ---- events ---------------------------------------------------------------

  _bindEvents() {
    const el = this.renderer.domElement;
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this.host);

    this._onDown = (e) => {
      this.pointerType = e.pointerType;
      this.pointerDown = true;
      this.dragLast = { x: e.clientX, y: e.clientY };
      this._setPointer(e);
      if (this._dragAllowed()) el.setPointerCapture?.(e.pointerId);
    };
    this._onMove = (e) => {
      this.pointerType = e.pointerType;
      this._setPointer(e);
      if (this.pointerDown && this.dragLast && this._dragAllowed()) {
        const dx = e.clientX - this.dragLast.x;
        this.dragLast = { x: e.clientX, y: e.clientY };
        // Dragging turns the car through the front-to-side shots.
        if (this.viewTarget >= DRAG_RANGE[0] && this.viewTarget <= DRAG_RANGE[1]) {
          this.viewTarget = clamp(this.viewTarget + dx * 0.035, DRAG_RANGE[0], DRAG_RANGE[1]);
        }
      }
    };
    this._onUp = (e) => {
      this.pointerDown = false;
      this.dragLast = null;
      if (e.pointerType === "touch") this.pointer.set(9, 9);
    };
    this._onLeave = () => {
      if (this.pointerType !== "touch") this.pointer.set(9, 9);
    };
    this._onVis = () => {
      this.last = performance.now();
    };
    this._onLost = (e) => {
      e.preventDefault();
      store.set({ webgl: false });
    };

    el.addEventListener("pointerdown", this._onDown);
    window.addEventListener("pointermove", this._onMove, { passive: true });
    window.addEventListener("pointerup", this._onUp);
    window.addEventListener("pointercancel", this._onUp);
    document.addEventListener("pointerleave", this._onLeave);
    document.addEventListener("visibilitychange", this._onVis);
    el.addEventListener("webglcontextlost", this._onLost);
  }

  _setPointer(e) {
    const r = this.host.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  }

  _dragAllowed() {
    const ch = this.metrics.chapter;
    return store.get().phase === "experience" && Boolean(CHAPTERS[ch]?.drag);
  }

  resize() {
    if (this.disposed) return;
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    const pr = Math.min(window.devicePixelRatio || 1, this.preset.maxPixelRatio) * this.prScale;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.frames.setSize(w, h);
    const asp = w / h;
    this.pcam.left = -HALF_H * asp;
    this.pcam.right = HALF_H * asp;
    this.pcam.top = HALF_H;
    this.pcam.bottom = -HALF_H;
    this.pcam.updateProjectionMatrix();
    if (this.particles?.ok) {
      this.particles.setPixelRatio(pr);
      this.particles.setHalf(HALF_H * asp, HALF_H);
      this._placeTargets();
    }
  }

  // ---- frame loop -----------------------------------------------------------

  start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  tick = (now) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (document.hidden) {
      this.last = now;
      return;
    }
    const raw = now - this.last;
    this.last = now;
    const dt = Math.min(raw / 1000, 0.05);
    this.quality.sample(raw);
    this.time += dt;
    this.frame(dt);
  };

  frame(dt) {
    const sc = this.scroll;
    sc?.update(dt);
    const u = sc ? sc.u : 0;
    const ch = Math.min(N - 1, Math.floor(u));
    const local = clamp(u - ch);
    const phase = store.get().phase;
    this.metrics.u = u;
    this.metrics.chapter = ch;

    this._updateReveal(dt);
    const drive = this._updateDrive(u);
    sound.setEngine(drive.speedNorm, drive.fade > 0.02 ? drive.fade : 0);

    // Which frame, and how it is laid out.
    this._advanceFrame(this._targetFrame(ch, local, dt), dt);
    const L = this._layoutFor(ch);
    this.cx = damp(this.cx, L.cx, 3, dt);
    const hold = CHAPTER_FRAMES[ch] && CHAPTER_FRAMES[ch][0] === CHAPTER_FRAMES[ch][1];
    this.zoomDrift = damp(this.zoomDrift, 1 + (hold ? 0.04 : 0.02) * local, 4, dt);
    this.revealZoom = damp(this.revealZoom, 1, 1.6, dt);
    const shake = this.reducedMotion ? 0 : 0.004 * drive.speedNorm * drive.fade * Math.sin(this.time * 41);
    this.frames.setLayout({ cx: this.cx, zoom: L.zoom * this.zoomDrift * this.revealZoom * (1 + shake), fx: L.fx, fy: L.fy });

    // The frame gives way to the particle car in chapter 5.
    const presence = smoothstep(3.7, 4.12, u) * (1 - smoothstep(4.82, 5.2, u));
    this.frames.render(this.renderer, { time: this.time, fade: this.exposure * (1 - 0.97 * presence) });

    this._updateParticles(dt, ch, local, phase);
    if (this.particles?.ok && this.particles.points.visible) {
      this.renderer.render(this.pscene, this.pcam);
    }
    this.listeners.forEach((fn) => fn(this));
  }

  _targetFrame(ch, local, dt) {
    const r = CHAPTER_FRAMES[ch];
    if (r) return r[0] + (r[1] - r[0]) * clamp((local - 0.06) / 0.88);
    this.viewPos = damp(this.viewPos, this.viewTarget, 8, dt);
    return this.viewPos;
  }

  // Scrubs smoothly between neighbouring frames and dissolves across the cuts
  // between shots.
  _advanceFrame(target, dt) {
    const f = this.frames;
    const d = this.dissolve;
    if (d) {
      d.to = target;
      d.t += dt / (this.reducedMotion ? 0.2 : 0.55);
      if (d.t >= 1) {
        this.pos = d.to;
        this.dissolve = null;
        f.setFrame(this.pos);
      } else {
        const e = d.t * d.t * (3 - 2 * d.t);
        f.setFrame(d.from, d.to, e);
      }
      return;
    }
    if (Math.abs(target - this.pos) > BIG_JUMP) {
      this.dissolve = { from: this.pos, to: target, t: 0 };
      f.setFrame(this.pos);
      return;
    }
    this.pos = damp(this.pos, target, 9, dt);
    f.setFrame(this.pos);
  }

  _updateReveal(dt) {
    const rv = this.reveal;
    if (!rv.running) {
      if (rv.done) this.exposure = 1;
      return;
    }
    rv.t = Math.min(1, rv.t + dt / rv.dur);
    this.exposure = smoothstep(0.0, 0.8, rv.t);
    if (rv.t >= 1) {
      rv.running = false;
      rv.done = true;
      this.exposure = 1;
    }
  }

  _updateDrive(u) {
    const D = CH.drive;
    const fade = smoothstep(D - 0.18, D + 0.2, u) * (1 - smoothstep(D + 0.92, D + 1.28, u));
    const speedNorm = fade > 0 ? easeOutCubic(clamp((u - (D + 0.06)) / 0.82)) * (1 - smoothstep(D + 1, D + 1.25, u)) : 0;
    this.metrics.speedNorm = speedNorm;
    this.metrics.speed = Math.round(TOP_SPEED_KMH * speedNorm);
    return { fade, speedNorm };
  }

  _updateParticles(dt, ch, local, phase) {
    const p = this.particles;
    if (!p?.ok) return;
    const inParticles = ch === CH.particles && phase === "experience";

    if (inParticles) {
      p.show(true);
      const zone = local < 0.1 ? 0 : local < 0.84 ? 1 : 2;
      if (zone !== this.ch5zone) {
        this.ch5zone = zone;
        if (zone === 1 && this.targets) this.formParticles();
        else if (zone === 0) this.scatterParticles();
        else if (zone === 2) this.disintegrateParticles();
      }
      const asp = this._aspect();
      const active = Math.abs(this.pointer.x) < 1.2 && (this.pointerType !== "touch" || this.pointerDown);
      p.setPointer(this._pw.set(this.pointer.x * HALF_H * asp, this.pointer.y * HALF_H, 0), active);
    } else {
      this.ch5zone = -1;
      p.setPointer(null, false);
      if (p.fadeTarget === 1) p.show(false);
    }
    p.update(dt);
  }

  // ---- teardown -------------------------------------------------------------

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this._ro.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this._onDown);
    el.removeEventListener("webglcontextlost", this._onLost);
    window.removeEventListener("pointermove", this._onMove);
    window.removeEventListener("pointerup", this._onUp);
    window.removeEventListener("pointercancel", this._onUp);
    document.removeEventListener("pointerleave", this._onLeave);
    document.removeEventListener("visibilitychange", this._onVis);
    if (this.particles) {
      this.pscene.remove(this.particles.points);
      this.particles.dispose();
    }
    this.frames.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    if (el.parentNode === this.host) this.host.removeChild(el);
    this.listeners.clear();
  }
}
