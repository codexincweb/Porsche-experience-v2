import { clamp, damp } from "./math.js";

// Native document scrolling, converted into one continuous chapter position
// `u` (chapter n spans n .. n + 1). Each chapter is a tall <section> with a
// sticky 100svh child, so touch, wheel, keyboard and scrollbar all work.
// The controller writes --l (local progress) onto each section for CSS and
// exposes a smoothed `u` for the 3D camera.

export class ScrollController {
  constructor(sections, { reducedMotion = false } = {}) {
    this.sections = sections;
    this.reducedMotion = reducedMotion;
    this.rects = [];
    this.y = window.scrollY;
    this.vh = window.innerHeight;
    this.rawU = 0;
    this.u = 0; // smoothed
    this.velocity = 0; // smoothed |du/dt|
    this.active = 0;
    this.listeners = new Set();
    this._lastRaw = 0;

    this._onScroll = () => {
      this.y = window.scrollY;
    };
    this._onResize = () => this.measure();
    window.addEventListener("scroll", this._onScroll, { passive: true });
    window.addEventListener("resize", this._onResize);
    this._ro = new ResizeObserver(() => this.measure());
    sections.forEach((s) => this._ro.observe(s));
    this.measure();
    this.update(0, true);
  }

  measure() {
    this.vh = window.innerHeight;
    const base = window.scrollY;
    this.rects = this.sections.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + base, height: r.height };
    });
  }

  tops() {
    return this.rects.map((r) => r.top);
  }

  get total() {
    const last = this.rects[this.rects.length - 1];
    return last ? last.top + last.height - this.vh : 1;
  }

  get progress() {
    return clamp(this.y / Math.max(1, this.total));
  }

  // Raw chapter position from the scroll offset.
  compute() {
    const n = this.rects.length;
    let i = 0;
    for (let k = 0; k < n; k++) if (this.y >= this.rects[k].top - 0.5) i = k;
    const r = this.rects[i];
    const span = Math.max(1, r.height - this.vh);
    const local = clamp((this.y - r.top) / span);
    return { i, local, u: Math.min(n, i + local) };
  }

  update(dt, snap = false) {
    const { i, local, u } = this.compute();
    this.rawU = u;
    if (snap || this.reducedMotion) this.u = u;
    else this.u = damp(this.u, u, 7, Math.max(dt, 0.001));
    const speed = dt > 0 ? Math.abs(this.u - this._lastRaw) / dt : 0;
    this._lastRaw = this.u;
    this.velocity = damp(this.velocity, speed, 6, Math.max(dt, 0.001));

    const n = this.sections.length;
    const active = Math.min(n - 1, i);
    for (let k = 0; k < n; k++) {
      const el = this.sections[k];
      const l = k === i ? local : k < i ? 1 : 0;
      el.style.setProperty("--l", l.toFixed(4));
      // Overlays are hidden (and unfocusable) in the dead zones at the
      // start and end of a chapter, where their opacity is already zero.
      const on = k === active && (local > 0.015 || k === 0) && (local < 0.985 || k === n - 1);
      if ((el.dataset.on === "1") !== on) el.dataset.on = on ? "1" : "0";
    }
    document.documentElement.style.setProperty("--progress", this.progress.toFixed(4));
    if (active !== this.active) {
      this.active = active;
      this.listeners.forEach((fn) => fn(active));
    }
  }

  local(index) {
    return clamp(this.u - index);
  }

  onChapter(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  scrollToChapter(index, instant = false) {
    const r = this.rects[index];
    // Land a little inside the chapter so its text is already visible.
    const top = r ? r.top + (index === 0 ? 0 : Math.max(0, r.height - this.vh) * 0.2) : 0;
    window.scrollTo({ top, behavior: instant || this.reducedMotion ? "auto" : "smooth" });
  }

  dispose() {
    window.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onResize);
    this._ro.disconnect();
    this.listeners.clear();
  }
}
