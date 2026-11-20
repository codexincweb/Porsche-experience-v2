import { useEffect, useRef } from "react";
import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";
import { useStage } from "../StageContext.js";

export default function Drive() {
  const stage = useStage();
  const num = useRef(null);
  const bar = useRef(null);

  useEffect(() => {
    if (!stage) return undefined;
    let last = -1;
    return stage.subscribe((s) => {
      const v = s.metrics.speed;
      if (v !== last) {
        last = v;
        if (num.current) num.current.textContent = String(v).padStart(3, "0");
        if (bar.current) bar.current.style.transform = `scaleX(${s.metrics.speedNorm})`;
      }
    });
  }, [stage]);

  return (
    <Chapter index={8} className="ch-drive">
      <Plate chapter={8} />
      <div className="streak" aria-hidden="true" />
      <div className="layer fade copy-block copy-left">
        <ChapterHead index={8} title={<>The road <em>comes to you</em></>} />
        <p className="lede">Keep scrolling. The pace follows your hand.</p>
      </div>
      <div className="layer fade speedo" aria-hidden="true">
        <div className="speed-num">
          <span ref={num}>000</span>
          <small>km/h</small>
        </div>
        <div className="speed-bar">
          <span ref={bar} />
        </div>
        <p className="footnote">Scroll-linked and illustrative. Ends at the manufacturer's 296 km/h top speed. Engine tone is synthesised.</p>
      </div>
    </Chapter>
  );
}
