import { useEffect, useRef, useState } from "react";
import { CHAPTERS } from "../config/chapters.js";
import { useStore } from "../core/store.js";
import { sound } from "../audio/SoundManager.js";

const pad = (n) => String(n + 1).padStart(2, "0");

// Chapter indicator (bottom left), scroll progress line, tick navigation on
// wide screens and a chapter sheet on small ones. Also announces chapter
// changes to assistive technology.
export default function ChapterNav({ scrollRef }) {
  const chapter = useStore((s) => s.chapter);
  const [open, setOpen] = useState(false);
  const sheetRef = useRef(null);

  const go = (i) => {
    sound.cue("tick");
    scrollRef.current?.scrollToChapter(i);
    setOpen(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t instanceof HTMLElement && t.closest("input, select, textarea, [role='radio'], [role='slider']")) return;
      if (e.key === "Escape") setOpen(false);
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" && chapter < CHAPTERS.length - 1) go(chapter + 1);
      if (e.key === "ArrowLeft" && chapter > 0) go(chapter - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter]);

  useEffect(() => {
    if (open) sheetRef.current?.querySelector("button")?.focus();
  }, [open]);

  return (
    <>
      <p className="sr-only" aria-live="polite">
        Chapter {chapter + 1} of {CHAPTERS.length}: {CHAPTERS[chapter].label}
      </p>

      <div className="chapter-indicator" aria-hidden="true">
        <span className="ci-num">
          {pad(chapter)}
          <i> / {CHAPTERS.length}</i>
        </span>
        <span className="ci-label">{CHAPTERS[chapter].label.toUpperCase()}</span>
      </div>

      <div className="progress-line" aria-hidden="true">
        <span />
      </div>

      <nav className="chapter-ticks" aria-label="Chapters">
        <ol>
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <button onClick={() => go(i)} aria-current={i === chapter ? "step" : undefined} aria-label={`${pad(i)} ${c.label}`}>
                <span className="tick-label">{c.label}</span>
                <span className="tick-mark" />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <button className="hud-button chapters-button" aria-expanded={open} aria-controls="chapter-sheet" onClick={() => setOpen((v) => !v)}>
        <span>{open ? "CLOSE" : "CHAPTERS"}</span>
      </button>
      {open && (
        <div className="chapter-sheet" id="chapter-sheet" ref={sheetRef} role="dialog" aria-label="Chapters">
          <ol>
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <button onClick={() => go(i)} aria-current={i === chapter ? "step" : undefined}>
                  <b>{pad(i)}</b>
                  <span>{c.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
