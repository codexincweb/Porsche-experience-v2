const STEPS = [
  [0.0, "PREPARING THE SCENE"],
  [0.2, "LOADING THE VEHICLE"],
  [0.85, "BUILDING THE PARTICLE FIELD"],
  [0.98, "READY"],
];

export default function LoadingScreen({ progress = 0 }) {
  const label = [...STEPS].reverse().find(([t]) => progress >= t)?.[1] ?? STEPS[0][1];
  const pct = Math.round(progress * 100);
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-mark" aria-hidden="true">
        P
      </div>
      <p>{label}</p>
      <div className="loading-track" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="loading-pct">{String(pct).padStart(3, "0")}</p>
    </div>
  );
}
