import { frameUrl, STATIC_FRAMES } from "../../config/frames.js";

// Backdrop for the written (no-WebGL) version of a chapter. In the full
// experience the scene is drawn on the GPU and this element is not shown.
const ALT = [
  "A yellow Porsche 911 GT3 RS seen from the front in a dark studio.",
  "The 911 GT3 RS turning to show its front three-quarter and side.",
  "Rear three-quarter view of the 911 GT3 RS with its swan-neck wing.",
  "The twin exhaust tips of the 911 GT3 RS.",
  "The 911 GT3 RS from the front.",
  "The driver's side of the 911 GT3 RS cockpit with the steering wheel and instruments.",
  "Side view of the 911 GT3 RS in yellow.",
  "Side view of the 911 GT3 RS in yellow.",
  "The 911 GT3 RS seen from behind as it pulls away.",
  "Front three-quarter view of the 911 GT3 RS.",
];

export default function Plate({ chapter }) {
  return (
    <div className="plate" aria-hidden="false">
      <img src={frameUrl("m", STATIC_FRAMES[chapter])} alt={ALT[chapter]} decoding="async" loading="lazy" draggable="false" />
    </div>
  );
}
