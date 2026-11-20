// Chapter copy and verified data.
//
// Every figure below comes from Porsche's press release for the 911 GT3 RS
// (17 August 2022, newsroom.porsche.com) unless the comment says otherwise.
// See docs/SPECS.md for the source of each value.

export const CHAPTERS = [
  {
    id: "arrival",
    label: "The Arrival",
    theme: "The machine emerges.",
    height: 3.2,
  },
  {
    id: "design",
    label: "The Design",
    theme: "Form follows performance.",
    height: 6,
  },
  {
    id: "aerodynamics",
    label: "Aerodynamics",
    theme: "Engineered to cut through the air.",
    height: 4.6,
  },
  {
    id: "machine",
    label: "The Machine",
    theme: "Engineering and performance.",
    height: 4.4,
  },
  {
    id: "particles",
    label: "The Particle Experience",
    theme: "The vehicle becomes energy.",
    height: 4,
  },
  {
    id: "cockpit",
    label: "The Cockpit",
    theme: "Driver-focused engineering.",
    height: 3.8,
  },
  {
    id: "configurator",
    label: "The Configurator",
    theme: "Make the vehicle your own.",
    height: 3.2,
    drag: true,
  },
  {
    id: "camera",
    label: "The Camera Experience",
    theme: "Experience the vehicle through your environment.",
    height: 3,
  },
  {
    id: "drive",
    label: "The Drive",
    theme: "Performance in motion.",
    height: 5,
  },
  {
    id: "showcase",
    label: "The Final Showcase",
    theme: "The complete machine.",
    height: 3,
  },
];

// Design details, shown in step with the matching shots of the footage.
export const DESIGN_DETAILS = [
  {
    id: "nose",
    title: "Central radiator",
    body:
      "One large, angled radiator sits in the nose and replaces the three-radiator layout of earlier cars. Hot air leaves through the nostrils in the front lid.",
  },
  {
    id: "bonnet",
    title: "Front lid nostrils",
    body:
      "Air that has passed through the central radiator exits through two large openings in the front lid.",
  },
  {
    id: "splitter",
    title: "Splitter and sideblades",
    body:
      "A splitter takes the place of a conventional front spoiler. Sideblades at each front corner guide air outward, around the wheels.",
  },
  {
    id: "headlight",
    title: "Headlights",
    body:
      "Round headlight units keep the unmistakable 911 face above the aerodynamic nose.",
  },
  {
    id: "wheel",
    title: "Centre-lock wheels",
    body:
      "Forged light-alloy centre-lock wheels, 20-inch at the front and 21-inch at the rear, with 275/35 and 335/30 tyres. Magnesium forged wheels are an option with the Weissach package.",
  },
  {
    id: "arch",
    title: "Wing vents and arch inlets",
    body:
      "Louvred openings in the front wings relieve pressure in the wheel arches, and inlets behind the front wheels feed air along the flanks.",
  },
  {
    id: "wing",
    title: "Swan-neck rear wing",
    body:
      "Swan-neck mounts carry a fixed main wing and a hydraulically adjustable upper element. Its upper edge sits higher than the roof, a first for a Porsche production car.",
  },
];

export const AERO_FACTS = [
  { value: "409", unit: "kg", label: "Downforce at 200 km/h" },
  { value: "860", unit: "kg", label: "Downforce at 285 km/h" },
];

export const MACHINE_SPECS = [
  { value: 525, unit: "PS", label: "Power", note: "386 kW" },
  { value: 465, unit: "Nm", label: "Torque" },
  { value: 9000, unit: "rpm", label: "Maximum engine speed" },
  { value: 3.2, unit: "s", label: "0 to 100 km/h", decimals: 1 },
  { value: 296, unit: "km/h", label: "Top speed, in seventh gear" },
  { value: 1450, unit: "kg", label: "Kerb weight, DIN" },
];

export const MACHINE_FACTS = [
  ["Engine", "4.0-litre naturally aspirated six-cylinder boxer"],
  ["Transmission", "Seven-speed PDK with a shorter overall ratio than the 911 GT3"],
  ["Drive", "Rear-wheel drive"],
  ["Rear differential", "Adjustable from the steering wheel"],
];

export const COCKPIT_ITEMS = [
  {
    id: "dials",
    title: "Four rotary controls",
    body:
      "Dials on the steering wheel change chassis settings, including the rear differential. Each adjustment is shown graphically in the instrument cluster.",
  },
  {
    id: "drs",
    title: "DRS button",
    body:
      "One button flattens the wing elements on a straight to cut drag, within a defined operating range. Under heavy braking at high speed the wings move to maximum instead.",
  },
  {
    id: "seats",
    title: "Full bucket seats",
    body:
      "The standard seats are full bucket seats. Carbon-fibre reinforced plastic is used in the interior to save weight.",
  },
  {
    id: "cluster",
    title: "Instrument cluster",
    body:
      "The settings made with the rotary controls are shown graphically in the instrument cluster, next to the speed and engine information.",
  },
];

export const SHOWCASE_LINES = [
  "4.0-litre flat-six",
  "525 PS",
  "9,000 rpm",
  "409 kg of downforce at 200 km/h",
];

export const DISCLAIMER =
  "Independent fan project. Not affiliated with, sponsored by or endorsed by Porsche AG. Porsche, 911 and GT3 RS are trademarks of Dr. Ing. h.c. F. Porsche AG.";
