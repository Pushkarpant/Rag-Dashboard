import { CSSProperties } from "react";

/**
 * Animated aurora / mesh-gradient background. Three slowly drifting blurred orbs
 * plus a faint grid. Purely decorative — sits behind content with pointerEvents none.
 * Honors prefers-reduced-motion via the global CSS override.
 */
export default function Aurora({
  variant = "indigo",
  style,
}: { variant?: "indigo" | "cyan" | "violet"; style?: CSSProperties }) {
  // Brand palette: sage / cream / gray tones
  const palettes: Record<string, [string, string, string]> = {
    indigo: ["#54c750", "#6fd96b", "#CBCBCB"],
    cyan:   ["#6fd96b", "#54c750", "#9be398"],
    violet: ["#54c750", "#CBCBCB", "#6fd96b"],
  };
  const [c1, c2, c3] = palettes[variant] ?? palettes.indigo;

  const orb = (color: string, size: number, extra: CSSProperties): CSSProperties => ({
    position: "absolute", width: size, height: size, borderRadius: "50%",
    background: `radial-gradient(circle at 30% 30%, ${color}55, ${color}00 70%)`,
    filter: "blur(60px)", willChange: "transform", ...extra,
  });

  return (
    <div aria-hidden style={{
      position: "absolute", inset: 0, overflow: "hidden",
      pointerEvents: "none", zIndex: 0, ...style,
    }}>
      <div style={orb(c1, 620, { top: "-12%", left: "-8%", animation: "auroraA 22s ease-in-out infinite" })} />
      <div style={orb(c2, 520, { bottom: "-14%", right: "-6%", animation: "auroraB 26s ease-in-out infinite" })} />
      <div style={orb(c3, 420, { top: "30%", left: "45%", opacity: .7, animation: "auroraC 30s ease-in-out infinite" })} />
      {/* faint grid overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: .5,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px)," +
          "linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)",
        backgroundSize: "44px 44px",
        maskImage: "radial-gradient(circle at 50% 40%,#000 0%,transparent 75%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 40%,#000 0%,transparent 75%)",
      }} />
    </div>
  );
}
