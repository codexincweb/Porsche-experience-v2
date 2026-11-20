import { useEffect, useRef } from "react";
import { Stage } from "../gl/Stage.js";
import { store } from "../core/store.js";
import { IS_DEV } from "../config/model.js";

// Owns the WebGL stage for the lifetime of the page. If WebGL cannot start,
// the store flips to webgl:false and the editorial fallback takes over.
export default function PorscheScene({ onStage }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let stage = null;
    try {
      stage = new Stage(hostRef.current, { reducedMotion: store.get().reducedMotion });
    } catch (error) {
      console.warn("[PorscheScene] WebGL unavailable, using the static layout.", error);
      store.set({ webgl: false });
      return undefined;
    }
    onStage(stage);
    // Inspection hooks for development and for automated tests (?debug).
    if (IS_DEV || new URLSearchParams(window.location.search).has("debug")) {
      window.__stage = stage;
      window.__store = store;
    }
    return () => {
      onStage(null);
      stage.dispose();
      if (window.__stage === stage) delete window.__stage;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="stage-host" ref={hostRef} aria-hidden="true" />;
}
