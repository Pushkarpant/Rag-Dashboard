import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginUser, signupUser, getMe } from "../services/api";
import { User } from "../types";

// ── Session lifetime ─────────────────────────────────────────────────────────
// Goal: a **refresh** keeps you logged in, but **closing the browser/tab logs
// you out** — even in Chrome/Edge with "continue where you left off", which
// restores sessionStorage and used to keep stale sessions alive.
//
// How: the token lives in sessionStorage, and we stamp a "last seen" heartbeat
// every few seconds while the tab is open. On startup we only restore the
// session if that heartbeat is fresh. A reload takes well under the grace
// window, so it survives; a close (heartbeat stops) followed by a reopen falls
// outside the window, so the session is dropped.
const TOKEN_KEY = "rag_token";
const SEEN_KEY  = "rag_seen";
const CLOSE_GRACE_MS = 45_000; // gap that counts as "the browser was closed"
const HEARTBEAT_MS   = 10_000;

const now = () => new Date().getTime();
const markSeen    = () => sessionStorage.setItem(SEEN_KEY, String(now()));
const clearSession = () => { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(SEEN_KEY); };

// Was this tab merely refreshed (token + fresh heartbeat) rather than reopened?
function sessionIsFresh(): boolean {
  const t = sessionStorage.getItem(TOKEN_KEY);
  if (!t) return false;
  const seen = Number(sessionStorage.getItem(SEEN_KEY) || 0);
  return now() - seen < CLOSE_GRACE_MS;
}

interface Ctx { user:User|null; loading:boolean; token:string;
  login(e:string,p:string):Promise<void>;
  signup(e:string,p:string,n:string):Promise<void>;
  logout():void; }
const AuthContext = createContext<Ctx|undefined>(undefined);

export function AuthProvider({ children }: { children:ReactNode }) {
  // Decide freshness ONCE, synchronously, before any heartbeat can refresh it.
  const [restorable] = useState(sessionIsFresh);
  const [user,    setUser]    = useState<User|null>(null);
  const [token,   setToken]   = useState<string>(restorable ? sessionStorage.getItem(TOKEN_KEY)! : "");
  const [loading, setLoading] = useState(true);

  // Restore session on mount — only if the tab was refreshed, not reopened.
  useEffect(() => {
    if (!restorable) { clearSession(); setLoading(false); return; }
    markSeen();
    getMe().then(u => { setUser(u); setToken(sessionStorage.getItem(TOKEN_KEY) ?? ""); })
           .catch(() => clearSession())
           .finally(() => setLoading(false));
  }, [restorable]);

  // Heartbeat: keep "last seen" fresh while the tab is open (and on the way out).
  useEffect(() => {
    markSeen();
    const iv = setInterval(markSeen, HEARTBEAT_MS);
    const onVisible = () => { if (document.visibilityState === "visible") markSeen(); };
    window.addEventListener("beforeunload", markSeen);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(iv);
      window.removeEventListener("beforeunload", markSeen);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const login  = async (email:string, password:string) => {
    const d = await loginUser(email, password);
    sessionStorage.setItem(TOKEN_KEY, d.access_token); markSeen();
    setToken(d.access_token); setUser(d.user);
  };
  const signup = async (email:string, password:string, full_name:string) => {
    const d = await signupUser(email, password, full_name);
    sessionStorage.setItem(TOKEN_KEY, d.access_token); markSeen();
    setToken(d.access_token); setUser(d.user);
  };
  const logout = () => { clearSession(); setUser(null); setToken(""); };

  return <AuthContext.Provider value={{ user, loading, token, login, signup, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be inside <AuthProvider>");
  return c;
};
