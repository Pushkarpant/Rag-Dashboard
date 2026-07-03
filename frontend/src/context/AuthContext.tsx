import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginUser, signupUser, getMe } from "../services/api";
import { User } from "../types";
interface Ctx { user:User|null; loading:boolean; token:string;
  login(e:string,p:string):Promise<void>;
  signup(e:string,p:string,n:string):Promise<void>;
  logout():void; }
const AuthContext = createContext<Ctx|undefined>(undefined);
export function AuthProvider({ children }: { children:ReactNode }) {
  const [user,    setUser]    = useState<User|null>(null);
  const [token,   setToken]   = useState<string>(localStorage.getItem("rag_token")??"");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = localStorage.getItem("rag_token");
    if (!t) { setLoading(false); return; }
    getMe().then(u => { setUser(u); setToken(t); })
           .catch(() => localStorage.removeItem("rag_token"))
           .finally(() => setLoading(false));
  }, []);
  const login  = async (email:string, password:string) => {
    const d = await loginUser(email, password);
    localStorage.setItem("rag_token", d.access_token);
    setToken(d.access_token); setUser(d.user);
  };
  const signup = async (email:string, password:string, full_name:string) => {
    const d = await signupUser(email, password, full_name);
    localStorage.setItem("rag_token", d.access_token);
    setToken(d.access_token); setUser(d.user);
  };
  const logout = () => { localStorage.removeItem("rag_token"); setUser(null); setToken(""); };
  return <AuthContext.Provider value={{ user, loading, token, login, signup, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be inside <AuthProvider>");
  return c;
};
