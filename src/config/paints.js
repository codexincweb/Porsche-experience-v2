// Illustrative colours. These are NOT the official Porsche colour chart and
// the names are generic on purpose. Real factory paints are not reproduced.

export const PAINTS = [
  { id: "arctic", name: "Arctic", hex: "#d7dadd" },
  { id: "graphite", name: "Graphite", hex: "#4b5056" },
  { id: "obsidian", name: "Obsidian", hex: "#0c0d10" },
  { id: "signal", name: "Signal Red", hex: "#c4112f" },
  { id: "sulphur", name: "Sulphur", hex: "#d9bf16" },
  { id: "marine", name: "Marine", hex: "#1d4a82" },
  { id: "forest", name: "Forest", hex: "#1c3b2d" },
  { id: "copper", name: "Copper", hex: "#a85c36" },
];

export const FINISHES = [
  { id: "gloss", name: "Gloss" },
  { id: "metallic", name: "Metallic" },
  { id: "satin", name: "Satin" },
  { id: "matte", name: "Matte" },
];

export const VIEWS = [
  { id: "front", name: "Front" },
  { id: "front34", name: "Front 3/4" },
  { id: "side", name: "Side" },
  { id: "rear34", name: "Rear 3/4" },
  { id: "top", name: "Top" },
];

// null means the original yellow of the footage. Reset returns to this state.
export const DEFAULT_CONFIG = {
  paint: null,
  customPaint: null,
  finish: null,
};
