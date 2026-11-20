import { useEffect, useState } from "react";
import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";
import { DESIGN_DETAILS } from "../../config/chapters.js";
import { useStage } from "../StageContext.js";
import { sound } from "../../audio/SoundManager.js";

// Scroll position (0..1 within the chapter) at which each detail takes over,
// matched to the shots in the footage: the 3/4 turn, the side, the headlight
// close-up and the wheel and brake close-up.
const ZONES = [0, 0.12, 0.32, 0.66];
const ORDER = ["bonnet", "arch", "headlight", "wheel"];
const DETAILS = ORDER.map((id) => DESIGN_DETAILS.find((d) => d.id === id));

export default function Design() {
  const stage = useStage();
  const [active, setActive] = useState(0);

  // Follow the scroll; an explicit tap holds until the scroll crosses a zone.
  useEffect(() => {
    if (!stage) return undefined;
    let last = -1;
    return stage.subscribe((s) => {
      const l = s.metrics.u - 1;
      if (l < 0 || l > 1) return;
      let z = 0;
      ZONES.forEach((t, i) => {
        if (l >= t) z = i;
      });
      if (z !== last) {
        last = z;
        setActive(z);
      }
    });
  }, [stage]);

  const d = DETAILS[active];
  return (
    <Chapter index={1} className="ch-design">
      <Plate chapter={1} />
      <div className="layer fade copy-block copy-left">
        <ChapterHead index={1} title={<>Every surface <em>has a job</em></>} />
        <ol className="detail-list" aria-label="Design details">
          {DETAILS.map((item, i) => (
            <li key={item.id}>
              <button
                className={i === active ? "is-active" : ""}
                aria-current={i === active ? "true" : undefined}
                onClick={() => {
                  setActive(i);
                  sound.cue("tick");
                }}
              >
                <b>{String(i + 1).padStart(2, "0")}</b>
                {item.title}
              </button>
            </li>
          ))}
        </ol>
        <div className="detail-card" key={d.id}>
          <h3>{d.title}</h3>
          <p>{d.body}</p>
        </div>
      </div>
    </Chapter>
  );
}
