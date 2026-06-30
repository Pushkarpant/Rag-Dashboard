// frontend/src/pages/Login.tsx

import { useState, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const inputStyle: CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  background: "#06060F", border: "1px solid #1E1E3A", color: "#F1F5F9",
  fontSize: 14, outline: "none", transition: "border-color 0.2s ease"
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#06060F", position: "relative", overflow: "hidden", fontFamily: "'Inter', sans-serif"
    }}>
      {/* Ambient glow accents */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #6366F125, transparent 70%)", top: "-15%", left: "-10%" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #06B6D420, transparent 70%)", bottom: "-15%", right: "-10%" }} />

      <div style={{ width: 380, position: "relative", zIndex: 1, padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: "linear-gradient(135deg, #6366F1, #06B6D4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 16px", boxShadow: "0 0 30px #6366F140"
          }}>✦</div>
          <h1 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: "#64748B", fontSize: 13 }}>Sign in to DocuMind</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 16, padding: 28 }}>
          {error && (
            <div style={{
              background: "#EF444415", border: "1px solid #EF444430", borderRadius: 8,
              padding: "10px 14px", marginBottom: 16, color: "#EF4444", fontSize: 13
            }}>
              {error}
            </div>
          )}

          <label style={{ display: "block", color: "#94A3B8", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email" required value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#6366F1")}
            onBlur={e => (e.target.style.borderColor = "#1E1E3A")}
          />

          <label style={{ display: "block", color: "#94A3B8", fontSize: 12, fontWeight: 600, marginTop: 16, marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password" required value={password} placeholder="••••••••"
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#6366F1")}
            onBlur={e => (e.target.style.borderColor = "#1E1E3A")}
          />

          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", marginTop: 24, padding: "12px 0", borderRadius: 10,
              background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "white",
              fontWeight: 600, fontSize: 14, border: "none",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              boxShadow: "0 4px 16px #6366F140"
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#64748B", fontSize: 13, marginTop: 20 }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "#6366F1", fontWeight: 600, textDecoration: "none" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
