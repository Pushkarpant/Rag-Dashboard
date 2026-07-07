// frontend/src/pages/Signup.tsx
import { useState, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Aurora from "../components/Aurora";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const { signup } = useAuth();
  const navigate   = useNavigate();

  const inputS: CSSProperties = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    background:"var(--bg)", border:"1px solid var(--border)",
    color:"var(--text)", fontSize:14, outline:"none",
    transition:"border-color .2s, box-shadow .2s", fontFamily:"inherit",
  };
  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#54c750";
    e.target.style.boxShadow = "0 0 0 3px #54c75025";
  };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--border)";
    e.target.style.boxShadow = "none";
  };
  // Password strength: 0–4 from length + variety
  const strength = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthMeta = [
    { label: "", color: "var(--border)" },
    { label: "Weak", color: "#BC5646" },
    { label: "Fair", color: "#B08430" },
    { label: "Good", color: "#6fd96b" },
    { label: "Strong", color: "#54c750" },
  ][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try {
      await signup(email, password, fullName);
      navigate("/dashboard");   // ← correct destination
    } catch (err: any) {
      setError(err.response?.data?.detail || "Signup failed. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"var(--bg)", position:"relative",
      overflow:"hidden", fontFamily:"'Inter',sans-serif" }}>

      <Aurora variant="cyan" />

      <div style={{ width:"100%", maxWidth:400, position:"relative",
        zIndex:1, padding:"0 20px", animation:"scaleIn .5s var(--ease-spring) both" }}>

        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link to="/" style={{ textDecoration:"none" }}>
            <div style={{ width:52, height:52, borderRadius:14,
              background:"linear-gradient(135deg,#54c750,#6fd96b)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24, margin:"0 auto 16px",
              boxShadow:"0 0 30px #54c75060",
              animation:"float 4s ease-in-out infinite" }}>✦</div>
          </Link>
          <h1 style={{ color:"var(--text)", fontSize:22, fontWeight:800,
            marginBottom:6, letterSpacing:"-0.5px" }}>Create your account</h1>
          <p style={{ color:"var(--text-dim)", fontSize:13 }}>
            Start asking questions from your documents
          </p>
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
            fontWeight:600, marginBottom:6 }}>Full name</label>
          <input type="text" required value={fullName} placeholder="Pushkar Pant"
            onChange={e => setFullName(e.target.value)} style={inputS}
            onFocus={focusOn} onBlur={focusOff} />

          <label style={{ display:"block", color:"var(--text-muted)", fontSize:12,
            fontWeight:600, marginTop:16, marginBottom:6 }}>Email address</label>
          <input type="email" required value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)} style={inputS}
            onFocus={focusOn} onBlur={focusOff} />

          <label style={{ display:"block", color:"var(--text-muted)", fontSize:12,
            fontWeight:600, marginTop:16, marginBottom:6 }}>Password</label>
          <input type="password" required value={password}
            placeholder="At least 6 characters"
            onChange={e => setPassword(e.target.value)} style={inputS}
            onFocus={focusOn} onBlur={focusOff} />

          {/* Password strength meter */}
          <div style={{ marginTop:10 }}>
            <div style={{ display:"flex", gap:4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex:1, height:4, borderRadius:3, overflow:"hidden",
                  background:"var(--border)" }}>
                  <div style={{ height:"100%", width: strength >= i ? "100%" : "0%",
                    background: strengthMeta.color, borderRadius:3,
                    transition:"width .4s var(--ease-spring)" }}/>
                </div>
              ))}
            </div>
            {password.length > 0 && (
              <div style={{ fontSize:11, marginTop:5, color: strengthMeta.color, fontWeight:600,
                textAlign:"right", transition:"color .3s" }}>{strengthMeta.label}</div>
            )}
          </div>

          <button type="submit" disabled={loading} className="press sheen" style={{
            width:"100%", marginTop:18, padding:"12px 0", borderRadius:10,
            background:"var(--grad-btn)",
            color:"white", fontWeight:700, fontSize:14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow:"0 4px 16px #54c75040" }}>
            {loading ? "Creating account…" : "Create Account →"}
          </button>

          <div style={{ marginTop:16, padding:"9px 12px",
            background:"#54c75010", border:"1px solid #54c75020",
            borderRadius:8, color:"var(--text-dim)", fontSize:11,
            textAlign:"center", lineHeight:1.5 }}>
            💡 The <strong style={{ color:"var(--text-muted)" }}>first</strong> signup
            automatically becomes admin
          </div>
        </form>

        <p style={{ textAlign:"center", color:"var(--text-dim)",
          fontSize:13, marginTop:20 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color:"#54c750", fontWeight:600,
            textDecoration:"none" }}>Sign in</Link>
        </p>
        <p style={{ textAlign:"center", marginTop:8 }}>
          <Link to="/" style={{ color:"var(--text-dim)", fontSize:12,
            textDecoration:"none" }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
