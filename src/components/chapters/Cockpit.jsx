import { useEffect, useState } from "react";
import Chapter, { ChapterHead } from "./Chapter.jsx";
import { COCKPIT_ITEMS } from "../../config/chapters.js";
import Plate from "./Plate.jsx";
import { useStage } from "../StageContext.js";
import { sound } from "../../audio/SoundManager.js";

export default function Cockpit() {
  const stage = useStage();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!stage) return undefined;
    let last = -1;
    return stage.subscribe((s) => {
      const l = s.metrics.u - 5;
      if (l < 0 || l > 1) return;
      const z = Math.min(COCKPIT_ITEMS.length - 1, Math.floor(l * COCKPIT_ITEMS.length * 0.98));
      if (z !== last) {
        last = z;
        setActive(z);
      }
    });
  }, [stage]);

  const item = COCKPIT_ITEMS[active];
  return (
    <Chapter index={5} className="ch-cockpit">
      <Plate chapter={5} />
      <div className="layer fade copy-block copy-right">
        <ChapterHead index={5} title={<>Everything points <em>at the driver</em></>} />
        <ol className="detail-list" aria-label="Cockpit details">
          {COCKPIT_ITEMS.map((c, i) => (
            <li key={c.id}>
              <button
                className={i === active ? "is-active" : ""}
                aria-current={i === active ? "true" : undefined}
                onClick={() => {
                  setActive(i);
                  sound.cue("tick");
                }}
              >
                <b>{String(i + 1).padStart(2, "0")}</b>
                {c.title}
              </button>
            </li>
          ))}
        </ol>
        <div className="detail-card" key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </div>
      </div>
    </Chapter>
  );
}
