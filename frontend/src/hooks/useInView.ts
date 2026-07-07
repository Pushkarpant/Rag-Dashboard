import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal hook. Returns a ref + boolean that flips to true the first time
 * the element scrolls into view. Pair with the `.reveal` / `.reveal.in` classes.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  { threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = {}
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fallback for environments without IntersectionObserver
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView } as const;
}
