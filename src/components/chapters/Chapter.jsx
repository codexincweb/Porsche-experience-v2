import { CHAPTERS } from "../../config/chapters.js";

const pad = (n) => String(n + 1).padStart(2, "0");

// One scroll chapter: a tall section holding a sticky full-height pin. The
// ScrollController writes --l (0..1) to the section; CSS turns it into fades.
export default function Chapter({ index, children, className = "" }) {
  const c = CHAPTERS[index];
  return (
    <section
      id={`ch-${c.id}`}
      className={`chapter ${className}`}
      data-index={index}
      data-on={index === 0 ? "1" : "0"}
      style={{ "--h": c.height }}
      aria-labelledby={`h-${c.id}`}
    >
      <div className="pin">{children}</div>
    </section>
  );
}

export function ChapterHead({ index, title, as: Tag = "h2", children }) {
  const c = CHAPTERS[index];
  return (
    <header className="chapter-head">
      <p className="eyebrow">
        {pad(index)} <span className="eyebrow-rule" /> {c.label.toUpperCase()}
      </p>
      <Tag id={`h-${c.id}`} className="display">
        {title}
      </Tag>
      <p className="theme">{c.theme}</p>
      {children}
    </header>
  );
}
