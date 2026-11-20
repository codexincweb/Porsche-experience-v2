import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";
import { useStage } from "../StageContext.js";
import { useStore } from "../../core/store.js";
import { sound } from "../../audio/SoundManager.js";

export default function Particles() {
  const stage = useStage();
  const state = useStore((s) => s.particleState);
  const density = useStore((s) => s.density);
  const supports = useStore((s) => s.modelSupports.particles);
  const engine = useStore((s) => s.particleEngine);
  const off = !stage || engine === "unsupported";

  return (
    <Chapter index={4} className="ch-particles">
      <Plate chapter={4} />
      <div className="layer fade copy-block copy-left">
        <ChapterHead index={4} title={<>The car, <em>released</em></>} />
        <p className="lede">
          Every point on screen is taken from a frame of the real car, keeps that pixel's colour and is simulated on the GPU. Move the pointer, or drag a finger across the car, to push the particles aside.
        </p>

        <div className="controls" role="group" aria-label="Particle controls">
          <button
            className="btn"
            disabled={off || !supports}
            onClick={() => {
              stage.disintegrateParticles();
              sound.cue("whoosh");
            }}
          >
            Disintegrate
          </button>
          <button
            className="btn btn-primary"
            disabled={off || !supports || state === "formed"}
            onClick={() => {
              stage.formParticles();
              sound.cue("confirm");
            }}
          >
            Reassemble
          </button>
        </div>

        <label className="range">
          <span>
            Density <b>{Math.round(density * 100)}%</b>
          </span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            value={density}
            disabled={off}
            onChange={(e) => stage.setDensity(Number(e.target.value))}
            aria-label="Particle density"
          />
        </label>

        {engine === "unsupported" && <p className="footnote">This device cannot run the GPU particle simulation.</p>}
      </div>
    </Chapter>
  );
}
