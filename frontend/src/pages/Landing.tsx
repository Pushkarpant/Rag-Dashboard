// frontend/src/pages/Landing.tsx — animated "wow" landing
import { Link } from "react-router-dom";
import { CSSProperties, ReactNode, useState } from "react";
import Aurora from "../components/Aurora";
import { useInView } from "../hooks/useInView";

/** Persistent light/dark toggle shared via <html data-theme> + localStorage. */
function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark"
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("rag_theme", next);
  };
  return (
    <button onClick={toggle} className="press spin-hover" aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)",
        background: "var(--surface)", color: "var(--text-muted)", fontSize: 16,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

const FEATURES = [
  { icon: "🧠", title: "Llama 3.3 70B Brain", desc: "Powered by Meta's Llama 3.3 70B on Groq — blazing-fast, accurate answers grounded in your private documents." },
  { icon: "🔍", title: "Semantic Search",    desc: "Vector embeddings via Pinecone find answers by meaning, not just keyword matching." },
  { icon: "🔐", title: "Private by Design",  desc: "Multi-tenant isolation — every user's documents are scoped to their account only." },
  { icon: "📊", title: "Admin Analytics",    desc: "Real-time platform dashboard: query volume, confidence trends, user activity, document inventory." },
  { icon: "💬", title: "Chat History",       desc: "Every conversation saved and searchable — pick up any previous session from the sidebar." },
  { icon: "⚡", title: "Confidence Scoring", desc: "Every answer comes with a validated confidence percentage so you know how reliable it is." },
];

const STEPS = [
  { n: "01", title: "Create your account",   desc: "Sign up in seconds." },
  { n: "02", title: "Upload your documents", desc: "Drag-drop PDFs or TXT files. Real-time processing progress." },
  { n: "03", title: "Ask anything",          desc: "Type a question in plain English. Get cited answers in seconds." },
];

/** Wraps children in a scroll-reveal container. */
function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: CSSProperties }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal${inView ? " in" : ""}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

/** Pointer-tracking 3D tilt + glow for feature cards. */
function TiltCard({ f, i }: { f: typeof FEATURES[number]; i: number }) {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${-py * 8}deg) rotateY(${px * 8}deg) translateY(-4px)`;
    el.style.borderColor = "#54c75060";
    el.style.boxShadow = `${-px * 20}px ${py * 20 + 14}px 44px #54c75025`;
    (el.querySelector(".tilt-glow") as HTMLElement).style.opacity = "1";
    (el.querySelector(".tilt-glow") as HTMLElement).style.background =
      `radial-gradient(240px circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, #54c75020, transparent 60%)`;
  };
  const reset = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.transform = "";
    el.style.borderColor = "var(--border)";
    el.style.boxShadow = "none";
    (el.querySelector(".tilt-glow") as HTMLElement).style.opacity = "0";
  };
  return (
    <Reveal delay={i * 70}>
      <div onMouseMove={onMove} onMouseLeave={reset}
        style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "24px 22px", textAlign: "left", height: "100%",
          transition: "transform .2s ease, border-color .2s ease, box-shadow .2s ease",
          transformStyle: "preserve-3d", cursor: "default", overflow: "hidden" }}>
        <div className="tilt-glow" style={{ position: "absolute", inset: 0, opacity: 0,
          transition: "opacity .3s", pointerEvents: "none" }} />
        <div style={{ fontSize: 28, marginBottom: 12, filter: "drop-shadow(0 4px 10px #54c75040)" }}>{f.icon}</div>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>{f.title}</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>{f.desc}</div>
      </div>
    </Reveal>
  );
}

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter',sans-serif", color: "var(--text)", overflowX: "hidden", position: "relative" }}>
      <Aurora variant="indigo" style={{ position: "fixed", height: "100vh" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── NAV ── */}
        <nav className="glass" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          borderBottom: "1px solid var(--border)", padding: "14px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--grad)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, boxShadow: "0 0 16px #54c75060", animation: "float 4s ease-in-out infinite" }}>✦</div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.3px" }}>Verity</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ThemeToggle />
            <Link to="/login" className="press" style={{ padding: "8px 18px", borderRadius: 8,
              border: "1px solid var(--border)", color: "var(--text-muted)",
              textDecoration: "none", fontSize: 13, fontWeight: 500 }}>Sign In</Link>
            <Link to="/signup" className="press sheen" style={{ padding: "8px 18px", borderRadius: 8,
              background: "var(--grad-btn)", color: "#fff", textDecoration: "none", fontSize: 13,
              fontWeight: 600, boxShadow: "0 4px 16px #54c75040" }}>Get Started Free</Link>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ paddingTop: 150, paddingBottom: 90, textAlign: "center", position: "relative" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
              background: "#54c75018", border: "1px solid #54c75040",
              borderRadius: 20, padding: "6px 16px", marginBottom: 28,
              animation: "fadeUp .6s ease both", backdropFilter: "blur(6px)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#54c750",
                boxShadow: "0 0 8px #54c750", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#54c750", fontSize: 12, fontWeight: 600 }}>
                Powered by Gemini + Groq + Pinecone
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(34px,6.5vw,66px)", fontWeight: 900,
              lineHeight: 1.08, marginBottom: 24, letterSpacing: "-2px",
              animation: "fadeUp .6s .1s ease both" }}>
              Ask Anything From<br />
              <span className="gradient-text">Your Documents</span>
            </h1>

            <p style={{ fontSize: "clamp(15px,2vw,19px)", color: "var(--text-muted)",
              lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px",
              animation: "fadeUp .6s .2s ease both" }}>
              Upload PDFs and text files, then ask questions in plain English.
              Get cited answers with confidence scores in seconds — not hours of manual searching.
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center",
              flexWrap: "wrap", animation: "fadeUp .6s .3s ease both" }}>
              <Link to="/signup" className="press sheen" style={{ padding: "14px 32px", borderRadius: 12,
                background: "var(--grad-btn)", color: "#fff", textDecoration: "none", fontWeight: 700,
                fontSize: 15, boxShadow: "0 8px 28px #54c75050", display: "inline-flex",
                alignItems: "center", gap: 8 }}>
                Start for Free →
              </Link>
              <Link to="/login" className="press" style={{ padding: "14px 32px", borderRadius: 12,
                border: "1px solid var(--border)", color: "var(--text-muted)",
                textDecoration: "none", fontWeight: 600, fontSize: 15, background: "var(--surface)" }}>
                Sign In
              </Link>
            </div>

            <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 18,
              animation: "fadeUp .6s .4s ease both" }}>
              No credit card required · Free-tier friendly · First signup becomes admin
            </p>
          </div>
        </section>

        {/* ── MOCK UI PREVIEW ── */}
        <section style={{ maxWidth: 900, margin: "0 auto 110px", padding: "0 24px" }}>
          <Reveal>
            <div className="grad-border lift" style={{ background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 20, overflow: "hidden",
              boxShadow: "0 40px 120px #54c75025, 0 0 0 1px #54c75010" }}>
              <div style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)",
                padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                {["#EF4444", "#F59E0B", "#54c750"].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                ))}
                <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 8 }}>
                  Verity — Document Intelligence
                </span>
              </div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ alignSelf: "flex-end", background: "var(--grad-btn)",
                  borderRadius: "18px 18px 4px 18px", padding: "12px 16px",
                  maxWidth: "70%", color: "#fff", fontSize: 14, boxShadow: "0 6px 20px #54c75030" }}>
                  What are the key risks mentioned in the Q3 report?
                </div>
                <div style={{ alignSelf: "flex-start", background: "var(--surface2)",
                  border: "1px solid var(--border)", borderRadius: "4px 18px 18px 18px",
                  padding: "12px 16px", maxWidth: "78%", fontSize: 13, lineHeight: 1.7,
                  color: "var(--text-muted)" }}>
                  Based on the Q3 Risk Report, the three primary risks identified are:
                  <br /><br />
                  <strong style={{ color: "var(--text)" }}>1. Credit concentration</strong> — real-estate exposure exceeded 18% threshold (p.12)
                  <br />
                  <strong style={{ color: "var(--text)" }}>2. Liquidity buffer shortfall</strong> — 30-day LCR at 108%, below 120% target (p.24)
                  <br />
                  <strong style={{ color: "var(--text)" }}>3. Model validation backlog</strong> — 14 high-priority models pending review (p.31)
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 4 }}>
                  <div style={{ height: 4, width: 80, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "87%", transformOrigin: "left",
                      background: "linear-gradient(90deg,#54c750,#6fd96b)", borderRadius: 2,
                      animation: "barGrow 1.4s .3s var(--ease-spring) both" }} />
                  </div>
                  <span style={{ color: "#54c750", fontSize: 11, fontWeight: 700 }}>87% confidence</span>
                  <span style={{ color: "var(--text-dim)", fontSize: 11 }}>· 3 sources found</span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ maxWidth: 860, margin: "0 auto 110px", padding: "0 24px", textAlign: "center" }}>
          <Reveal><h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>How it works</h2></Reveal>
          <Reveal delay={80}><p style={{ color: "var(--text-muted)", marginBottom: 56 }}>Three steps from document to insight</p></Reveal>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            {STEPS.map((s, i) => (
              <Reveal key={i} delay={i * 120} style={{ flex: "1 1 220px" }}>
                <div className="lift" style={{ background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 16, padding: 28, textAlign: "left", position: "relative", overflow: "hidden", height: "100%" }}>
                  <div style={{ fontSize: 52, fontWeight: 900,
                    background: "var(--grad)", WebkitBackgroundClip: "text", backgroundClip: "text",
                    WebkitTextFillColor: "transparent", opacity: .22,
                    position: "absolute", top: 8, right: 16, fontFamily: "'JetBrains Mono',monospace",
                    lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{s.title}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>{s.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ maxWidth: 960, margin: "0 auto 110px", padding: "0 24px", textAlign: "center" }}>
          <Reveal><h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>Everything you need</h2></Reveal>
          <Reveal delay={80}><p style={{ color: "var(--text-muted)", marginBottom: 56 }}>Built for engineers who want the full picture</p></Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => <TiltCard key={i} f={f} i={i} />)}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ textAlign: "center", padding: "80px 24px 120px" }}>
          <Reveal>
            <div style={{ maxWidth: 520, margin: "0 auto" }}>
              <div style={{ fontSize: 48, marginBottom: 20, animation: "float 3s ease-in-out infinite" }}>✦</div>
              <h2 style={{ fontSize: 34, fontWeight: 800, marginBottom: 14, letterSpacing: "-0.5px" }}>
                Ready to stop searching,<br /><span className="gradient-text">start knowing?</span>
              </h2>
              <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 15, lineHeight: 1.7 }}>
                Create your free account and upload your first document in under 2 minutes.
              </p>
              <Link to="/signup" className="press sheen" style={{ display: "inline-block", padding: "16px 40px",
                borderRadius: 12, background: "var(--grad-btn)", color: "#fff", textDecoration: "none",
                fontWeight: 700, fontSize: 16, animation: "glow 3s infinite" }}>
                Get Started — It's Free
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <span style={{ fontWeight: 700 }}>Verity</span>
          </div>
          <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
            Built with Groq · Gemini · Llama · Pinecone · FastAPI · React
          </span>
        </footer>
      </div>
    </div>
  );
}
