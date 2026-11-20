import { useEffect } from "react";
import { GOVERNOR, TIERS } from "../config/quality.js";
import { store } from "./store.js";

// Phase 1 device detection, kept as-is, plus a frame-time governor that
// lowers quality when the device cannot hold the frame rate.

export function detectTier() {
  const smallScreen = window.matchMedia("(max-width: 700px)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  let tier = "high";
  if (smallScreen || cores <= 4 || memory <= 4) tier = "balanced";
  if (cores <= 2 || memory <= 2) tier = "performance";
  return tier;
}

export function readProfile() {
  return {
    smallScreen: window.matchMedia("(max-width: 700px)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    quality: detectTier(),
  };
}

export class DeviceQualityManager {
  constructor(onChange) {
    this.onChange = onChange;
    this.frames = 0;
    this.sum = 0;
    this.strikes = 0;
    this.pixelRatioScale = 1;
  }

  get mode() {
    return store.get().tierMode;
  }

  setMode(mode) {
    this.strikes = 0;
    this.pixelRatioScale = 1;
    store.set({ tierMode: mode });
    const tier = mode === "auto" ? detectTier() : mode;
    store.set({ tier });
    this.onChange?.({ tier, pixelRatioScale: 1 });
  }

  // Called once per rendered frame with the frame time in milliseconds.
  sample(ms) {
    if (this.mode !== "auto") return;
    this.frames++;
    if (this.frames < GOVERNOR.warmupFrames) return;
    this.sum += ms;
    if ((this.frames - GOVERNOR.warmupFrames) % GOVERNOR.window !== 0) return;

    const avg = this.sum / GOVERNOR.window;
    this.sum = 0;
    if (avg <= GOVERNOR.slowMs) {
      this.strikes = 0;
      return;
    }
    if (++this.strikes < GOVERNOR.strikes) return;
    this.strikes = 0;

    const tier = store.get().tier;
    const idx = TIERS.indexOf(tier);
    if (idx < TIERS.length - 1) {
      const next = TIERS[idx + 1];
      store.set({ tier: next });
      this.pixelRatioScale = 1;
      this.onChange?.({ tier: next, pixelRatioScale: 1 });
    } else if (this.pixelRatioScale > 0.7) {
      // Already on the lowest tier: shave resolution instead.
      this.pixelRatioScale = Math.max(0.7, this.pixelRatioScale - 0.1);
      this.onChange?.({ tier, pixelRatioScale: this.pixelRatioScale });
    }
  }
}

export function useReducedMotionSync() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => store.set({ reducedMotion: mq.matches });
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
}
