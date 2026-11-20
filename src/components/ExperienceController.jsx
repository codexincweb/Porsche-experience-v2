import { useCallback, useEffect, useRef, useState } from "react";
import IntroScreen from "./IntroScreen.jsx";
import LoadingScreen from "./LoadingScreen.jsx";
import PorscheScene from "./PorscheScene.jsx";
import HUD from "./HUD.jsx";
import ChapterNav from "./ChapterNav.jsx";
import ModelStatus from "./ModelStatus.jsx";
import { StageContext, ScrollContext } from "./StageContext.js";
import Arrival from "./chapters/Arrival.jsx";
import Design from "./chapters/Design.jsx";
import Aerodynamics from "./chapters/Aerodynamics.jsx";
import Machine from "./chapters/Machine.jsx";
import Particles from "./chapters/Particles.jsx";
import Cockpit from "./chapters/Cockpit.jsx";
import Configurator from "./chapters/Configurator.jsx";
import CameraChapter from "./chapters/CameraChapter.jsx";
import Drive from "./chapters/Drive.jsx";
import Showcase from "./chapters/Showcase.jsx";
import { ScrollController } from "../core/ScrollController.js";
import { store, useStore } from "../core/store.js";
import { detectTier, useReducedMotionSync } from "../core/DeviceQualityManager.js";
import { sound } from "../audio/SoundManager.js";
import "../styles/experience.css";

const MIN_LOADING_MS = 1400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Detect the device once, before the stage is created.
store.set({ tier: detectTier(), reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches });

export default function ExperienceController() {
  const phase = useStore((s) => s.phase);
  const webgl = useStore((s) => s.webgl);
  const [stage, setStage] = useState(null);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef(null);
  const stageRef = useRef(null);
  useReducedMotionSync();

  const onStage = useCallback((s) => {
    stageRef.current = s;
    setStage(s);
  }, []);

  // Scrolling is locked until the visitor enters.
  useEffect(() => {
    document.documentElement.classList.toggle("is-locked", phase !== "experience");
    return () => document.documentElement.classList.remove("is-locked");
  }, [phase]);

  const enter = useCallback(async (withSound) => {
    store.set({ phase: "loading", sound: withSound });
    if (withSound) {
      sound.enable().then((ok) => {
        if (!ok) store.set({ sound: false });
      });
    }
    const t0 = performance.now();
    setProgress(0.12);
    const s = stageRef.current;
    if (s) await s.loadScene((p) => setProgress(0.2 + p * 0.65));
    setProgress(0.9);
    await sleep(Math.max(0, MIN_LOADING_MS - (performance.now() - t0)));
    setProgress(1);
    await sleep(180);
    window.scrollTo(0, 0);
    store.set({ phase: "experience" });
    s?.startReveal();
    sound.cue("whoosh");
  }, []);

  return (
    <StageContext.Provider value={stage}>
      <ScrollContext.Provider value={scrollRef}>
        <div className={`app-shell quality-${store.get().tier}`} data-mode={webgl ? "webgl" : "static"} data-phase={phase}>
          {webgl && <PorscheScene onStage={onStage} />}
          <div className="vignette" />

          {phase === "intro" && <IntroScreen onEnter={enter} />}
          {phase === "loading" && <LoadingScreen progress={progress} />}

          {phase === "experience" && (
            <>
              <a className="skip-link" href="#ch-design">
                Skip to the design chapter
              </a>
              <HUD />
              <Track stage={stage} scrollRef={scrollRef} />
              <ChapterNav scrollRef={scrollRef} />
              <ModelStatus />
              {!webgl && (
                <p className="static-note" role="status">
                  3D is not available on this device, so you are seeing the written version of the experience.
                </p>
              )}
            </>
          )}
        </div>
      </ScrollContext.Provider>
    </StageContext.Provider>
  );
}

function Track({ stage, scrollRef }) {
  const mainRef = useRef(null);
  const reduced = useStore((s) => s.reducedMotion);

  useEffect(() => {
    const sections = [...mainRef.current.querySelectorAll(".chapter")];
    const sc = new ScrollController(sections, { reducedMotion: reduced });
    scrollRef.current = sc;
    const off = sc.onChapter((i) => {
      store.set({ chapter: i });
      sound.cue("chapter");
    });
    stage?.attachScroll(sc);

    // Without a stage nothing else drives the controller, so tick it here.
    let raf = 0;
    if (!stage) {
      const loop = () => {
        sc.update(0.016);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      off();
      stage?.attachScroll(null);
      sc.dispose();
      scrollRef.current = null;
    };
  }, [stage, reduced, scrollRef]);

  return (
    <main id="main" className="track" ref={mainRef}>
      <h1 className="sr-only">Porsche Experience: the 911 GT3 RS, an independent interactive study</h1>
      <Arrival />
      <Design />
      <Aerodynamics />
      <Machine />
      <Particles />
      <Cockpit />
      <Configurator />
      <CameraChapter />
      <Drive />
      <Showcase />
    </main>
  );
}
