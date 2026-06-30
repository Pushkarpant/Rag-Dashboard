// frontend/src/context/AuthContext.tsx
// Global auth state: who's logged in, login/signup/logout actions.
// Wraps the whole app so any component can call useAuth().

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginUser, signupUser, getMe } from "../services/api";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, if a token is sitting in localStorage from a previous
  // session, validate it against the backend and restore the user —
  // this is what keeps you logged in after a page refresh.
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("rag_token");
      if (token) {
        try {
          const me = await getMe();
          setUser(me);
        } catch {
          localStorage.removeItem("rag_token");
        }
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginUser(email, password);
    localStorage.setItem("rag_token", data.access_token);
    setUser(data.user);
  };

  const signup = async (email: string, password: string, fullName: string) => {
    const data = await signupUser(email, password, fullName);
    localStorage.setItem("rag_token", data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("rag_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
