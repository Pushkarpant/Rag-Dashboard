// frontend/src/pages/Signup.tsx
import { useState, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { signup } = useAuth();
  const navigate   = useNavigate();

  const inputS: CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "var(--bg)", border: "1px solid var(--border)",
    color: "var(--text)", fontSize: 14, outline: "none",
    transition: "border-color .2s", fontFamily: "inherit",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try { await signup(email, password, fullName); navigate("/dashboard"); }
    catch (err: any) { setError(err.response?.data?.detail || "Signup failed. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", position: "relative",
      overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>

      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle,#06B6D425,transparent 70%)",
        top: "-15%", right: "-10%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle,#6366F120,transparent 70%)",
        bottom: "-15%", left: "-10%", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1, padding: "0 20px" }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14,
              background: "linear-gradient(135deg,#6366F1,#06B6D4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, margin: "0 auto 16px", boxShadow: "0 0 30px #6366F140" }}>✦</div>
          </Link>
          <h1 style={{ color: "var(--text)", fontSize: 22, fontWeight: 800,
            marginBottom: 6, letterSpacing: "-0.5px" }}>Create your account</h1>
          <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
            Start asking questions from your documents
          </p>
        </div>

        <form onSubmit={submit} style={{ background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>

          {error && (
            <div style={{ background: "#EF444415", border: "1px solid #EF444430",
              borderRadius: 8, padding: "10px 14px", marginBottom: 18,
              color: "#EF4444", fontSize: 13 }}>{error}</div>
          )}

          <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12,
            fontWeight: 600, marginBottom: 6 }}>Full name</label>
          <input type="text" required value={fullName} placeholder="Pushkar Pant"
            onChange={e => setFullName(e.target.value)} style={inputS}
            onFocus={e => (e.target.style.borderColor = "#6366F1")}
            onBlur={e  => (e.target.style.borderColor = "var(--border)")} />

          <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12,
            fontWeight: 600, marginTop: 16, marginBottom: 6 }}>Email address</label>
          <input type="email" required value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)} style={inputS}
            onFocus={e => (e.target.style.borderColor = "#6366F1")}
            onBlur={e  => (e.target.style.borderColor = "var(--border)")} />

          <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12,
            fontWeight: 600, marginTop: 16, marginBottom: 6 }}>Password</label>
          <input type="password" required value={password} placeholder="At least 6 characters"
            onChange={e => setPassword(e.target.value)} style={inputS}
            onFocus={e => (e.target.style.borderColor = "#6366F1")}
            onBlur={e  => (e.target.style.borderColor = "var(--border)")} />

          {/* Password strength mini bar */}
          <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
                background: password.length >= i * 3 ? (i === 3 ? "#10B981" : i === 2 ? "#F59E0B" : "#EF4444") : "var(--border)",
                transition: "background .3s" }} />
            ))}
          </div>

          <button type="submit" disabled={loading} style={{
            width: "100%", marginTop: 22, padding: "12px 0", borderRadius: 10,
            background: "linear-gradient(135deg,#6366F1,#4F46E5)",
            color: "white", fontWeight: 700, fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, boxShadow: "0 4px 16px #6366F140" }}>
            {loading ? "Creating account…" : "Create Account →"}
          </button>

          <div style={{ marginTop: 16, padding: "9px 12px", background: "#6366F110",
            border: "1px solid #6366F120", borderRadius: 8, color: "var(--text-dim)",
            fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>
            💡 The <strong style={{ color: "var(--text-muted)" }}>first</strong> person to sign up automatically becomes admin
          </div>
        </form>

        <p style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 13, marginTop: 20 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#6366F1", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 8 }}>
          <Link to="/" style={{ color: "var(--text-dim)", fontSize: 12, textDecoration: "none" }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
