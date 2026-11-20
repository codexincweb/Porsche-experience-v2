import { useCallback, useEffect, useRef, useState } from "react";
import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";
import { useStage } from "../StageContext.js";
import { useStore } from "../../core/store.js";
import { updateConfig } from "../../core/configActions.js";
import { averageAt, dominantColour, nearestPaint, paintSafe } from "../../core/colour.js";
import { sound } from "../../audio/SoundManager.js";

const SAMPLE_W = 160;

// The preview uses object-fit: cover, so a tap on the frame maps to a cropped
// region of the source image. Convert display coordinates to source ones.
function toSource(p, frame, src) {
  if (!frame || !src) return p;
  const sw = src.videoWidth || src.width;
  const sh = src.videoHeight || src.height;
  if (!sw || !sh) return p;
  const r = frame.getBoundingClientRect();
  const sa = sw / sh;
  const fa = r.width / r.height;
  if (sa > fa) return { x: 0.5 + (p.x - 0.5) * (fa / sa), y: p.y };
  return { x: p.x, y: 0.5 + (p.y - 0.5) * (sa / fa) };
}

// Everything here runs locally. Frames are drawn to an off-screen canvas to
// read pixel colours and are never stored or sent anywhere.
export default function CameraChapter() {
  const stage = useStage();
  const active = useStore((s) => s.chapter === 7);
  const [status, setStatus] = useState("idle"); // idle | requesting | live | denied | unavailable | still
  const [point, setPoint] = useState({ x: 0.5, y: 0.5 });
  const [picked, setPicked] = useState(null);
  const [dominant, setDominant] = useState(null);
  const videoRef = useRef(null);
  const stillRef = useRef(null);
  const streamRef = useRef(null);
  const workRef = useRef(null);
  const frameRef = useRef(null);
  const pointRef = useRef(point);
  pointRef.current = point;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (!active && status === "live") {
      stop();
      setStatus("idle");
    }
  }, [active, status, stop]);
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && streamRef.current) {
        stop();
        setStatus("idle");
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stop]);

  const readFrame = useCallback(() => {
    const src = status === "live" ? videoRef.current : stillRef.current;
    if (!src) return null;
    const sw = src.videoWidth || src.width;
    const sh = src.videoHeight || src.height;
    if (!sw || !sh) return null;
    const w = SAMPLE_W;
    const h = Math.max(1, Math.round((SAMPLE_W * sh) / sw));
    const c = (workRef.current ??= document.createElement("canvas"));
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }, [status]);

  const sample = useCallback(() => {
    const img = readFrame();
    if (!img) return;
    const p = toSource(pointRef.current, frameRef.current, status === "live" ? videoRef.current : stillRef.current);
    setPicked(averageAt(img, Math.round(p.x * (img.width - 1)), Math.round(p.y * (img.height - 1))));
    setDominant(dominantColour(img));
  }, [readFrame]);

  useEffect(() => {
    if (status !== "live") return undefined;
    const id = setInterval(sample, 280);
    return () => clearInterval(id);
  }, [status, sample]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play();
      setStatus("live");
    } catch (e) {
      stop();
      setStatus(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "denied" : "unavailable");
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stop();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = stillRef.current;
      const maxW = 640;
      const scale = Math.min(1, maxW / img.width);
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      setStatus("still");
      setTimeout(sample, 30);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    pointRef.current = p;
    setPoint(p);
    setTimeout(sample, 0);
  };

  const apply = (hex) => {
    updateConfig(stage, { customPaint: paintSafe(hex), paint: null });
    sound.cue("confirm");
  };

  const showFrame = status === "live" || status === "still";
  const near = picked ? nearestPaint(picked) : null;

  return (
    <Chapter index={7} className="ch-camera">
      <Plate chapter={7} />
      <div className="layer fade copy-block copy-top">
        <ChapterHead index={7} title={<>Paint it <em>from life</em></>} />
        <p className="lede">
          Point your camera at anything and tap a spot to read its colour. The car repaints in it. Pixels are read on this device and nothing is recorded or uploaded.
        </p>
      </div>

      <div className="layer fade cam-panel">
        <div ref={frameRef} className={`cam-frame ${showFrame ? "is-live" : ""}`} onPointerDown={showFrame ? pick : undefined}>
          <video ref={videoRef} playsInline muted aria-label="Camera preview. Tap to choose a colour." style={{ display: status === "live" ? "block" : "none" }} />
          <canvas ref={stillRef} aria-label="Chosen photo. Tap to choose a colour." style={{ display: status === "still" ? "block" : "none" }} />
          {!showFrame && <span className="cam-empty">Camera off</span>}
          {showFrame && <i className="cam-cross" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />}
        </div>
        <div className="cam-read">
          <div>
            <span className="chip" style={{ "--c": picked ?? "#1a1b1e" }} />
            <b>{picked ?? "—"}</b>
            <small>{near ? `Nearest: ${near.name}` : "Tap the preview"}</small>
            <button className="btn btn-small" disabled={!picked} onClick={() => apply(picked)}>
              Paint the car
            </button>
          </div>
          <div>
            <span className="chip" style={{ "--c": dominant ?? "#1a1b1e" }} />
            <b>{dominant ?? "—"}</b>
            <small>Dominant colour</small>
            <button className="btn btn-small" disabled={!dominant} onClick={() => apply(dominant)}>
              Paint the car
            </button>
          </div>
        </div>
        <div className="controls cam-controls">
          {status !== "live" ? (
            <button className="btn btn-primary" onClick={start} disabled={status === "requesting"}>
              {status === "requesting" ? "Waiting for permission" : "Use camera"}
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                stop();
                setStatus("idle");
              }}
            >
              Stop camera
            </button>
          )}
          <label className="btn file-btn">
            Choose a photo
            <input type="file" accept="image/*" capture="environment" onChange={onFile} />
          </label>
        </div>
        {status === "denied" && (
          <p className="footnote" role="status">
            Camera access was declined. You can allow it in your browser's site settings, or choose a photo instead.
          </p>
        )}
        {status === "unavailable" && (
          <p className="footnote" role="status">
            No camera is available here. Choose a photo instead, or pick a colour in the configurator.
          </p>
        )}
      </div>
    </Chapter>
  );
}
