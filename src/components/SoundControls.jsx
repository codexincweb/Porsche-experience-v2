export default function SoundControls({ enabled, onToggle }) {
  return (
    <button
      className="hud-button sound-control"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute sound" : "Enable sound"}
      title={enabled ? "Mute sound" : "Enable sound"}
    >
      <span className={`sound-bars ${enabled ? "is-playing" : ""}`} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>{enabled ? "SOUND ON" : "SOUND OFF"}</span>
    </button>
  );
}
