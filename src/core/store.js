import { useSyncExternalStore } from "react";
import { DEFAULT_CONFIG } from "../config/paints.js";

// A deliberately small observable store. High-frequency values (scroll
// progress, speed readout) never go through it; they are written straight to
// the DOM so React does not re-render at 60 fps.

const initial = {
  phase: "intro", // intro | loading | experience
  webgl: true,
  modelStatus: "idle", // idle | loading | loaded | builtin | invalid | error
  modelSupports: { paint: false, wheel: false, particles: false },
  particleEngine: "idle", // idle | ready | unsupported
  chapter: 0,
  sound: false,
  tier: "high",
  tierMode: "auto", // auto | high | balanced | performance
  config: { ...DEFAULT_CONFIG },
  particleState: "scattered", // scattered | formed
  density: 1,
  reducedMotion: false,
};

let state = initial;
const listeners = new Set();

export const store = {
  get: () => state,
  set(patch) {
    const next = typeof patch === "function" ? patch(state) : patch;
    let changed = false;
    for (const k of Object.keys(next)) {
      if (state[k] !== next[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(store.subscribe, () => selector(state));
}
