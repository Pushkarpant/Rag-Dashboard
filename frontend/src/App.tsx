// frontend/src/App.tsx
// SmartLanding automatically redirects logged-in users to /dashboard
// so they never get stuck on the landing page after login.

import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Landing    from "./pages/Landing";
import Login      from "./pages/Login";
import Signup     from "./pages/Signup";
import Dashboard  from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import "./index.css";

// If the user is already logged in and visits "/" send them straight
// to /dashboard — they never need to see the marketing landing page again.
function SmartLanding() {
  const { user, loading } = useAuth();
  if (loading) return null;                    // wait for session restore
  if (user)    return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

// Same guard for /login and /signup — bounce already-authed users away.
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user)    return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
      <Routes>
        {/* Public — redirect to /dashboard if already logged in */}
        <Route path="/"        element={<SmartLanding />} />
        <Route path="/login"   element={<PublicOnly><Login   /></PublicOnly>} />
        <Route path="/signup"  element={<PublicOnly><Signup  /></PublicOnly>} />

        {/* Protected — any logged-in user */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        {/* Protected — admin only */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}
