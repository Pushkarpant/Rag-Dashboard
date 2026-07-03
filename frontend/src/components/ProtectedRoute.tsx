// frontend/src/components/ProtectedRoute.tsx — Fix 1
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();

  // CRITICAL FIX 1: While AuthContext is restoring session from token,
  // we show a spinner instead of immediately redirecting to /login.
  // Without this, any hard refresh on /admin redirected to /login.
  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"var(--bg)", flexDirection:"column", gap:16 }}>
      <div style={{ width:36, height:36, border:"3px solid var(--border)",
        borderTopColor:"var(--primary)", borderRadius:"50%",
        animation:"spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ color:"var(--text-dim)", fontSize:13 }}>Restoring session…</span>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
