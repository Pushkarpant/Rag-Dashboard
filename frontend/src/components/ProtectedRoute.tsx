// frontend/src/components/ProtectedRoute.tsx
// Wraps a page and redirects to /login if not authenticated,
// or back to / if adminOnly is set and the user isn't an admin.

import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#06060F"
      }}>
        <div style={{
          width: 32, height: 32, border: "3px solid #1E1E3A", borderTopColor: "#6366F1",
          borderRadius: "50%", animation: "spin 0.8s linear infinite"
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
