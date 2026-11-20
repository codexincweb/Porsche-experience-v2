import { useStore } from "../core/store.js";

// Shown only when the scene images could not be fetched, so a blank screen is
// never mistaken for a design choice.
export default function ModelStatus() {
  const status = useStore((s) => s.modelStatus);
  if (status !== "error") return null;
  return (
    <p className="model-status" role="status">
      <i aria-hidden="true" />
      The scene images could not be loaded. Check your connection and reload the page.
    </p>
  );
}
