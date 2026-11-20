import { useEffect, useRef, useState } from "react";
import SoundControls from "./SoundControls.jsx";
import { useStage } from "./StageContext.js";
import { store, useStore } from "../core/store.js";
import { sound } from "../audio/SoundManager.js";

const TIER_OPTIONS = [
  ["auto", "Auto"],
  ["high", "High"],
  ["balanced", "Balanced"],
  ["performance", "Low"],
];

function QualityMenu() {
  const stage = useStage();
  const mode = useStore((s) => s.tierMode);
  const tier = useStore((s) => s.tier);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (e.type === "pointerdown" && ref.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!stage) return null;
  return (
    <div className="quality" ref={ref}>
      <button
        className="hud-button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Graphics quality"
      >
        <span>GFX · {mode === "auto" ? `AUTO/${tier === "performance" ? "LOW" : tier.toUpperCase()}` : tier === "performance" ? "LOW" : tier.toUpperCase()}</span>
      </button>
      {open && (
        <div className="quality-menu" role="radiogroup" aria-label="Graphics quality">
          {TIER_OPTIONS.map(([id, label]) => (
            <button
              key={id}
              role="radio"
              aria-checked={mode === id}
              className={mode === id ? "is-selected" : ""}
              onClick={() => {
                stage.setTierMode(id);
                sound.cue("tick");
              }}
            >
              {label}
            </button>
          ))}
          <p>Auto lowers detail if the frame rate drops.</p>
        </div>
      )}
    </div>
  );
}

export default function HUD() {
  const soundOn = useStore((s) => s.sound);
  const [fs, setFs] = useState(false);
  const canFullscreen = typeof document !== "undefined" && document.fullscreenEnabled;

  useEffect(() => {
    const on = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const toggleSound = async () => {
    if (soundOn) {
      sound.mute();
      store.set({ sound: false });
    } else {
      const ok = await sound.enable();
      store.set({ sound: ok });
      if (ok) sound.cue("confirm");
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <header className="hud">
      <a className="wordmark" href="#ch-arrival" aria-label="Porsche Experience, back to the start">
        PORSCHE <span>EXPERIENCE</span>
      </a>
      <div className="hud-actions">
        <QualityMenu />
        {canFullscreen && (
          <button className="hud-button" onClick={toggleFullscreen} aria-pressed={fs} aria-label={fs ? "Exit full screen" : "Full screen"}>
            <span>{fs ? "EXIT" : "FULL"}</span>
          </button>
        )}
        <SoundControls enabled={soundOn} onToggle={toggleSound} />
      </div>
    </header>
  );
}
