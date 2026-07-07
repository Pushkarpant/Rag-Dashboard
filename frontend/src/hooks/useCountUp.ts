import { useEffect, useRef, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Animate a number from 0 → `value` with an ease-out curve.
 * `decimals` controls rounding; the animation is skipped for reduced-motion users.
 */
export function useCountUp(value: number, { duration = 1000, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>();
  const start = useRef<number>();

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    if (prefersReduced() || duration <= 0) { setDisplay(target); return; }

    const p = Math.pow(10, decimals);
    const step = (t: number) => {
      if (start.current == null) start.current = t;
      const progress = Math.min((t - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(target * eased * p) / p);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    start.current = undefined;
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration, decimals]);

  return display;
}
