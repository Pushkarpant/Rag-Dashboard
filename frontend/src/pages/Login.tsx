// frontend/src/pages/Login.tsx
import { useState, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const inputS: CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "var(--bg)", border: "1px solid var(--border)",
    color: "var(--text)", fontSize: 14, outline: "none",
    transition: "border-color .2s", fontFamily: "inherit",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await login(email, password); navigate("/dashboard"); }
    catch (err: any) { setError(err.response?.data?.detail || "Login failed. Check your email and password."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", position: "relative",
      overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>

      {/* Ambient glows */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle,#6366F125,transparent 70%)",
        top: "-15%", left: "-10%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle,#06B6D420,transparent 70%)",
        bottom: "-15%", right: "-10%", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1, padding: "0 20px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14,
              background: "linear-gradient(135deg,#6366F1,#06B6D4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, margin: "0 auto 16px", boxShadow: "0 0 30px #6366F140",
              animation: "glow 3s infinite" }}>✦</div>
          </Link>
          <h1 style={{ color: "var(--text)", fontSize: 22, fontWeight: 800,
            marginBottom: 6, letterSpacing: "-0.5px" }}>Welcome back</h1>
          <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Sign in to DocuMind</p>
        </div>

        <form onSubmit={submit} style={{ background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>

          {error && (
            <div style={{ background: "#EF444415", border: "1px solid #EF444430",
              borderRadius: 8, padding: "10px 14px", marginBottom: 18,
              color: "#EF4444", fontSize: 13 }}>{error}</div>
          )}

          <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12,
            fontWeight: 600, marginBottom: 6 }}>Email address</label>
          <input type="email" required value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)} style={inputS}
            onFocus={e => (e.target.style.borderColor = "#6366F1")}
            onBlur={e  => (e.target.style.borderColor = "var(--border)")} />

          <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12,
            fontWeight: 600, marginTop: 18, marginBottom: 6 }}>Password</label>
          <input type="password" required value={password} placeholder="••••••••"
            onChange={e => setPassword(e.target.value)} style={inputS}
            onFocus={e => (e.target.style.borderColor = "#6366F1")}
            onBlur={e  => (e.target.style.borderColor = "var(--border)")} />

          <button type="submit" disabled={loading} style={{
            width: "100%", marginTop: 24, padding: "12px 0", borderRadius: 10,
            background: "linear-gradient(135deg,#6366F1,#4F46E5)",
            color: "white", fontWeight: 700, fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, boxShadow: "0 4px 16px #6366F140",
            transition: "opacity .2s" }}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 13, marginTop: 20 }}>
          No account yet?{" "}
          <Link to="/signup" style={{ color: "#6366F1", fontWeight: 600, textDecoration: "none" }}>
            Create one free
          </Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 8 }}>
          <Link to="/" style={{ color: "var(--text-dim)", fontSize: 12, textDecoration: "none" }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
