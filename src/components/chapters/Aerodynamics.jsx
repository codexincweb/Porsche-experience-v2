import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";
import { AERO_FACTS } from "../../config/chapters.js";

export default function Aerodynamics() {
  return (
    <Chapter index={2} className="ch-aero">
      <Plate chapter={2} />
      <div className="layer fade copy-block copy-left">
        <ChapterHead index={2} title={<>Air, <em>put to work</em></>} />
        <p className="lede">
          The wing, splitter and sideblades work as one system. A DRS button flattens the wing elements on the straights; under heavy braking at speed the same elements move to maximum for the airbrake.
        </p>
        <dl className="facts">
          {AERO_FACTS.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>
                {f.value}
                <small>{f.unit}</small>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Chapter>
  );
}
