import { useState } from "react";
import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";
import { FINISHES, PAINTS, VIEWS } from "../../config/paints.js";
import { useStage } from "../StageContext.js";
import { useStore } from "../../core/store.js";
import { resetConfig, updateConfig } from "../../core/configActions.js";
import { sound } from "../../audio/SoundManager.js";

function Swatches({ label, items, value, onPick, disabled, custom }) {
  return (
    <fieldset className="field" disabled={disabled}>
      <legend>{label}</legend>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {custom && (
          <button
            role="radio"
            aria-checked
            className="swatch is-selected"
            style={{ "--c": custom }}
            title={`Sampled colour ${custom}`}
            onClick={() => {}}
          >
            <span className="sr-only">Sampled colour {custom}</span>
          </button>
        )}
        {items.map((it) => (
          <button
            key={it.id}
            role="radio"
            aria-checked={!custom && value === it.id}
            className={`swatch ${!custom && value === it.id ? "is-selected" : ""}`}
            style={{ "--c": it.hex }}
            title={it.name}
            onClick={() => onPick(it.id)}
          >
            <span className="sr-only">{it.name}</span>
          </button>
        ))}
      </div>
      <p className="field-value">{custom ? "Sampled from camera" : items.find((i) => i.id === value)?.name ?? "Original yellow"}</p>
    </fieldset>
  );
}

export default function Configurator() {
  const stage = useStage();
  const config = useStore((s) => s.config);
  const [view, setView] = useState("front34");

  const set = (patch) => updateConfig(stage, patch);

  return (
    <Chapter index={6} className="ch-config">
      <Plate chapter={6} />
      <div className="layer fade copy-block copy-top">
        <ChapterHead index={6} title={<>Choose every <em>detail</em></>} />
        <p className="lede">Pick a colour and a finish and the car is repainted live. Drag the car to turn it from the front to the side.</p>
      </div>

      <div className="layer fade config-panel">
        <Swatches
          label="Paint"
          items={PAINTS}
          value={config.paint}
          custom={config.customPaint}
          onPick={(id) => set({ paint: id, customPaint: null })}
        />
        <fieldset className="field">
          <legend>Finish</legend>
          <div className="segments" role="radiogroup" aria-label="Finish">
            {FINISHES.map((f) => (
              <button key={f.id} role="radio" aria-checked={config.finish === f.id} className={config.finish === f.id ? "is-selected" : ""} onClick={() => set({ finish: f.id })}>
                {f.name}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend>View</legend>
          <div className="segments" role="radiogroup" aria-label="View">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={view === v.id}
                className={view === v.id ? "is-selected" : ""}
                onClick={() => {
                  setView(v.id);
                  stage?.setView(v.id);
                  sound.cue("tick");
                }}
              >
                {v.name}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="panel-foot">
          <button className="btn" onClick={() => { resetConfig(stage); setView("front34"); }}>
            Reset
          </button>
          <p className="footnote">Illustrative colours, not the official Porsche colour chart.</p>
        </div>
      </div>
    </Chapter>
  );
}
