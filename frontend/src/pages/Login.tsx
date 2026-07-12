// frontend/src/pages/Login.tsx
import { useState, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Aurora from "../components/Aurora";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const inputS: CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "var(--bg)", border: "1px solid var(--border)",
    color: "var(--text)", fontSize: 14, outline: "none",
    transition: "border-color .2s, box-shadow .2s", fontFamily: "inherit",
  };
  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#54c750";
    e.target.style.boxShadow = "0 0 0 3px #54c75025";
  };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--border)";
    e.target.style.boxShadow = "none";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");   // ← correct destination
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Check your email and password.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"var(--bg)", position:"relative",
      overflow:"hidden", fontFamily:"'Inter',sans-serif" }}>

      <Aurora variant="indigo" />

      <div style={{ width:"100%", maxWidth:400, position:"relative",
        zIndex:1, padding:"0 20px", animation:"scaleIn .5s var(--ease-spring) both" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link to="/" style={{ textDecoration:"none" }}>
            <div style={{ width:52, height:52, borderRadius:14,
              background:"linear-gradient(135deg,#54c750,#6fd96b)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24, margin:"0 auto 16px", boxShadow:"0 0 30px #54c75060",
              animation:"float 4s ease-in-out infinite" }}>✦</div>
          </Link>
          <h1 style={{ color:"var(--text)", fontSize:22, fontWeight:800,
            marginBottom:6, letterSpacing:"-0.5px" }}>Welcome back</h1>
          <p style={{ color:"var(--text-dim)", fontSize:13 }}>Sign in to Verity</p>
        </div>

        <form onSubmit={submit} className="grad-border" style={{ background:"var(--surface)",
          border:"1px solid var(--border)", borderRadius:16, padding:28,
          boxShadow:"0 30px 80px #54c75018" }}>
          {error && (
            <div className="scale-in" style={{ background:"#EF444415", border:"1px solid #EF444430",
              borderRadius:8, padding:"10px 14px", marginBottom:18,
              color:"#EF4444", fontSize:13 }}>{error}</div>
          )}

          <label style={{ display:"block", color:"var(--text-muted)", fontSize:12,
            fontWeight:600, marginBottom:6 }}>Email address</label>
          <input type="email" required value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)} style={inputS}
            onFocus={focusOn} onBlur={focusOff} />

          <label style={{ display:"block", color:"var(--text-muted)", fontSize:12,
            fontWeight:600, marginTop:18, marginBottom:6 }}>Password</label>
          <input type="password" required value={password} placeholder="••••••••"
            onChange={e => setPassword(e.target.value)} style={inputS}
            onFocus={focusOn} onBlur={focusOff} />

          <button type="submit" disabled={loading} className="press sheen" style={{
            width:"100%", marginTop:24, padding:"12px 0", borderRadius:10,
            background:"var(--grad-btn)",
            color:"white", fontWeight:700, fontSize:14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow:"0 4px 16px #54c75040", transition:"opacity .2s" }}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p style={{ textAlign:"center", color:"var(--text-dim)",
          fontSize:13, marginTop:20 }}>
          No account yet?{" "}
          <Link to="/signup" style={{ color:"#54c750", fontWeight:600,
            textDecoration:"none" }}>Create one free</Link>
        </p>
        <p style={{ textAlign:"center", marginTop:8 }}>
          <Link to="/" style={{ color:"var(--text-dim)", fontSize:12,
            textDecoration:"none" }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
