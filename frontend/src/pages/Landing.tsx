// frontend/src/pages/Landing.tsx  — Fix 5: stunning landing page
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: "🧠", title: "Gemini AI Brain",        desc: "Powered by Google's Gemini 3.5 Flash — free, fast, accurate answers from your private documents." },
  { icon: "🔍", title: "Semantic Search",         desc: "Vector embeddings via Pinecone mean you find answers by meaning, not just keyword matching." },
  { icon: "🔐", title: "Private by Design",       desc: "Multi-tenant isolation — every user's documents are cryptographically scoped to their account only." },
  { icon: "📊", title: "Admin Analytics",         desc: "Real-time platform dashboard: query volume, confidence trends, user activity, document inventory." },
  { icon: "💬", title: "Chat History",            desc: "Every conversation saved and searchable — pick up any previous session from the sidebar." },
  { icon: "⚡", title: "Confidence Scoring",      desc: "Every answer comes with a validated confidence percentage so you know exactly how reliable it is." },
];

const STEPS = [
  { n: "01", title: "Create your account",    desc: "Sign up in seconds. First user becomes admin automatically." },
  { n: "02", title: "Upload your documents",  desc: "Drag-drop PDFs or TXT files. Real-time processing progress." },
  { n: "03", title: "Ask anything",           desc: "Type a question in plain English. Get cited answers in seconds." },
];

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter',sans-serif", color: "var(--text)", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "#06060Fee", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)", padding: "14px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#6366F1,#06B6D4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "0 0 16px #6366F140" }}>✦</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>DocuMind</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/login" style={{ padding: "8px 18px", borderRadius: 8,
            border: "1px solid var(--border)", color: "var(--text-muted)",
            textDecoration: "none", fontSize: 13, fontWeight: 500,
            transition: "all .2s" }}>Sign In</Link>
          <Link to="/signup" style={{ padding: "8px 18px", borderRadius: 8,
            background: "linear-gradient(135deg,#6366F1,#4F46E5)", color: "#fff",
            textDecoration: "none", fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 16px #6366F140" }}>Get Started Free</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 140, paddingBottom: 100, textAlign: "center",
        position: "relative", overflow: "hidden" }}>
        {/* ambient orbs */}
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle,#6366F122,transparent 70%)",
          top: "10%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle,#06B6D415,transparent 70%)",
          bottom: 0, right: "10%", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
            background: "#6366F115", border: "1px solid #6366F130",
            borderRadius: 20, padding: "6px 16px", marginBottom: 28,
            animation: "fadeUp .6s ease forwards" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981",
              animation: "pulse 2s infinite" }} />
            <span style={{ color: "#6366F1", fontSize: 12, fontWeight: 600 }}>
              Powered by Gemini 3.5 Flash + Pinecone
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(32px,6vw,64px)", fontWeight: 800,
            lineHeight: 1.1, marginBottom: 24, letterSpacing: "-1.5px",
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
            <Link to="/signup" style={{ padding: "14px 32px", borderRadius: 12,
              background: "linear-gradient(135deg,#6366F1,#4F46E5)", color: "#fff",
              textDecoration: "none", fontWeight: 700, fontSize: 15,
              boxShadow: "0 8px 28px #6366F150", display: "inline-flex",
              alignItems: "center", gap: 8 }}>
              Start for Free →
            </Link>
            <Link to="/login" style={{ padding: "14px 32px", borderRadius: 12,
              border: "1px solid var(--border)", color: "var(--text-muted)",
              textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
              Sign In
            </Link>
          </div>

          <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 18,
            animation: "fadeUp .6s .4s ease both" }}>
            No credit card required · Free Gemini API tier · First signup becomes admin
          </p>
        </div>
      </section>

      {/* ── MOCK UI PREVIEW ── */}
      <section style={{ maxWidth: 900, margin: "0 auto 100px", padding: "0 24px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 40px 100px #6366F120, 0 0 0 1px #6366F110",
          animation: "scaleIn .6s .4s ease both" }}>
          {/* fake title bar */}
          <div style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)",
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            {["#EF4444","#F59E0B","#10B981"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
            <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 8 }}>
              DocuMind — Document Intelligence
            </span>
          </div>
          {/* fake chat */}
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ alignSelf: "flex-end", background: "linear-gradient(135deg,#6366F1,#4F46E5)",
              borderRadius: "18px 18px 4px 18px", padding: "12px 16px",
              maxWidth: "70%", color: "#fff", fontSize: 14 }}>
              What are the key risks mentioned in the Q3 report?
            </div>
            <div style={{ alignSelf: "flex-start", background: "var(--surface2)",
              border: "1px solid var(--border)", borderRadius: "4px 18px 18px 18px",
              padding: "12px 16px", maxWidth: "78%", fontSize: 13, lineHeight: 1.7,
              color: "var(--text-muted)" }}>
              Based on the Q3 Risk Report, the three primary risks identified are:
              <br /><br />
              <strong style={{ color: "var(--text)" }}>1. Credit concentration</strong> — exposure in real-estate sector exceeded 18% threshold (p.12)
              <br />
              <strong style={{ color: "var(--text)" }}>2. Liquidity buffer shortfall</strong> — 30-day LCR at 108%, below 120% internal target (p.24)
              <br />
              <strong style={{ color: "var(--text)" }}>3. Model validation backlog</strong> — 14 high-priority models pending review (p.31)
            </div>
            {/* confidence bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 4 }}>
              <div style={{ height: 4, width: 80, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "87%",
                  background: "linear-gradient(90deg,#10B981,#06B6D4)", borderRadius: 2 }} />
              </div>
              <span style={{ color: "#10B981", fontSize: 11, fontWeight: 700 }}>87% confidence</span>
              <span style={{ color: "var(--text-dim)", fontSize: 11 }}>· 3 sources found</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 860, margin: "0 auto 100px", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>
          How it works
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 56 }}>Three steps from document to insight</p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: "1 1 220px", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 16, padding: 28,
              textAlign: "left", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: "var(--border)",
                position: "absolute", top: 12, right: 16, fontFamily: "'JetBrains Mono',monospace",
                lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{s.title}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 960, margin: "0 auto 100px", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>
          Everything you need
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 56 }}>
          Built for engineers who want the full picture
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "24px 22px", textAlign: "left",
              transition: "border-color .2s, transform .2s", cursor: "default" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#6366F140"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = ""; }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign: "center", padding: "80px 24px 120px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 20, animation: "float 3s ease-in-out infinite" }}>✦</div>
          <h2 style={{ fontSize: 34, fontWeight: 800, marginBottom: 14, letterSpacing: "-0.5px" }}>
            Ready to stop searching,<br /><span className="gradient-text">start knowing?</span>
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 15, lineHeight: 1.7 }}>
            Create your free account and upload your first document in under 2 minutes.
          </p>
          <Link to="/signup" style={{ display: "inline-block", padding: "16px 40px",
            borderRadius: 12, background: "linear-gradient(135deg,#6366F1,#4F46E5)",
            color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 16,
            boxShadow: "0 8px 32px #6366F150", animation: "glow 3s infinite" }}>
            Get Started — It's Free
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>✦</span>
          <span style={{ fontWeight: 700 }}>DocuMind</span>
        </div>
        <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
          Built with Gemini · Pinecone · FastAPI · React
        </span>
      </footer>
    </div>
  );
}
