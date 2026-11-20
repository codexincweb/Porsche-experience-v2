import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";

export default function Arrival() {
  return (
    <Chapter index={0} className="ch-arrival">
      <Plate chapter={0} />
      <div className="layer fade copy-block copy-low">
        <ChapterHead index={0} title={<>911 <em>GT3 RS</em></>} as="h2" />
        <p className="lede">
          A 4.0-litre naturally aspirated flat-six, a swan-neck wing that rises above the roofline, and a body shaped by what air does at speed. Built for the circuit, approved for the road.
        </p>
        <div className="scroll-cue" aria-hidden="true">
          <span /> SCROLL TO EXPLORE
        </div>
      </div>
    </Chapter>
  );
}
