import { useEffect, useRef } from "react";
import Chapter, { ChapterHead } from "./Chapter.jsx";
import Plate from "./Plate.jsx";
import { MACHINE_FACTS, MACHINE_SPECS } from "../../config/chapters.js";
import { useStore } from "../../core/store.js";
import { tween, easeOutCubic } from "../../core/math.js";

function Counter({ spec, active }) {
  const ref = useRef(null);
  const decimals = spec.decimals ?? 0;
  const fmt = (v) => (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-GB"));

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!active) {
      el.textContent = fmt(spec.value);
      return undefined;
    }
    return tween({
      duration: 1500,
      ease: easeOutCubic,
      onUpdate: (v) => {
        el.textContent = fmt(v * spec.value);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="spec">
      <dd>
        <span ref={ref}>{fmt(spec.value)}</span>
        <small>{spec.unit}</small>
      </dd>
      <dt>
        {spec.label}
        {spec.note && <em> · {spec.note}</em>}
      </dt>
    </div>
  );
}

export default function Machine() {
  const active = useStore((s) => s.chapter === 3);
  return (
    <Chapter index={3} className="ch-machine">
      <Plate chapter={3} />
      <div className="layer fade copy-block copy-left">
        <ChapterHead index={3} title={<>Four litres, <em>nine thousand</em></>} />
        <dl className="specs">
          {MACHINE_SPECS.map((s) => (
            <Counter key={s.label} spec={s} active={active} />
          ))}
        </dl>
        <dl className="spec-table">
          {MACHINE_FACTS.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="footnote">Manufacturer figures for the 911 GT3 RS (992). See docs/SPECS.md for sources.</p>
      </div>
    </Chapter>
  );
}
