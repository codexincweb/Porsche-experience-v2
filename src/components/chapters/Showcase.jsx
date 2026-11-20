import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";
import { DISCLAIMER, SHOWCASE_LINES } from "../../config/chapters.js";
import { useStage, useScroll } from "../StageContext.js";
import { resetConfig } from "../../core/configActions.js";
import { sound } from "../../audio/SoundManager.js";

export default function Showcase() {
  const stage = useStage();
  const scrollRef = useScroll();

  const replay = () => {
    sound.cue("whoosh");
    resetConfig(stage);
    window.scrollTo({ top: 0, behavior: "auto" });
    scrollRef.current?.update(0, true);
    stage?.replay();
  };

  return (
    <Chapter index={9} className="ch-showcase">
      <Plate chapter={9} />
      <div className="layer fade copy-block copy-low">
        <ChapterHead index={9} title={<>Fully <em>assembled</em></>} />
        <ul className="closing-lines">
          {SHOWCASE_LINES.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className="controls">
          <button className="btn btn-primary" onClick={replay}>
            Replay the experience
          </button>
        </div>
        <p className="legal">{DISCLAIMER}</p>
      </div>
    </Chapter>
  );
}
