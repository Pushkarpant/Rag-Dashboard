// frontend/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing    from "./pages/Landing";
import Login      from "./pages/Login";
import Signup     from "./pages/Signup";
import Dashboard  from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import "./index.css";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/"        element={<Landing />} />
        <Route path="/login"   element={<Login   />} />
        <Route path="/signup"  element={<Signup  />} />

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
    </AuthProvider>
  );
}
