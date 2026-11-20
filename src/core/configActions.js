import { store } from "./store.js";
import { DEFAULT_CONFIG } from "../config/paints.js";
import { sound } from "../audio/SoundManager.js";

// Single place where configurator state changes, so the camera chapter and the
// configurator panel always agree and the 3D materials update immediately.
export function updateConfig(stage, patch, { quiet = false } = {}) {
  const next = { ...store.get().config, ...patch };
  store.set({ config: next });
  stage?.setConfig(next);
  if (!quiet) sound.cue("tick");
}

export function resetConfig(stage) {
  store.set({ config: { ...DEFAULT_CONFIG } });
  stage?.setConfig({ ...DEFAULT_CONFIG });
  stage?.setView("front34");
  sound.cue("confirm");
}
