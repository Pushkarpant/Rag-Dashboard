import axios from "axios";
import { Source, Document, Stats, User, AdminStats, AdminUserRow, AdminQueryRow, AdminDocumentRow, ActivityPoint, Conversation, ConvoMessage } from "../types";

// API base URL, resolved per environment:
//   • VITE_API_BASE (if set at build time) always wins — explicit override.
//   • Production build → "" (same origin): the FastAPI server also serves this
//     SPA, so relative URLs like /ask hit the same host. No CORS, one deploy.
//   • Dev → 127.0.0.1:8000. We use 127.0.0.1 (IPv4) explicitly, not "localhost":
//     on Windows "localhost" resolves to IPv6 ::1 first, but uvicorn binds
//     127.0.0.1 (IPv4), so localhost:8000 hits a dead socket and fails.
const BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const api  = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const t = sessionStorage.getItem("rag_token");
  if (t) cfg.headers.set("Authorization", `Bearer ${t}`);
  return cfg;
});
api.interceptors.response.use(r => r, e => {
  // On auth failure clear the whole session (token + heartbeat) so the app
  // falls back to logged-out state cleanly. Keys mirror AuthContext.
  if (e.response?.status === 401) {
    sessionStorage.removeItem("rag_token");
    sessionStorage.removeItem("rag_seen");
  }
  return Promise.reject(e);
});

export const loginUser  = async (email:string, password:string) =>
  (await api.post("/auth/login",  { email, password })).data as { access_token:string; user:User };
export const signupUser = async (email:string, password:string, full_name:string) =>
  (await api.post("/auth/signup", { email, password, full_name })).data as { access_token:string; user:User };
export const getMe      = async () => (await api.get("/auth/me")).data as User;

export const askQuestion = async (question:string, top_k=7) =>
  (await api.post("/ask", { question, top_k })).data as
  { answer:string; sources:Source[]; confidence:number; suggestions:string[]; chunks_used:number };

export const uploadDocumentSSE = (
  file: File, token: string,
  onProgress: (stage:string, pct:number) => void,
  onDone:     (filename:string, chunks:number) => void,
  onError:    (msg:string) => void
) => {
  const form = new FormData();
  form.append("file", file);
  fetch(`${BASE}/documents/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }).then(res => {
    if (!res.ok || !res.body) { onError("Upload failed"); return; }
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    const pump = (): void => {
      reader.read().then(({ done, value }) => {
        if (done) return;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.error) { onError(d.error); return; }
            onProgress(d.stage, d.pct);
            if (d.done) { onDone(d.filename ?? file.name, d.chunks ?? 0); return; }
          } catch { /* malformed SSE line */ }
        }
        pump();
      }).catch(() => onError("Connection lost"));
    };
    pump();
  }).catch(() => onError("Network error"));
};

export const getDocuments   = async () => (await api.get("/documents")).data  as { documents:Document[]; total_chunks:number; total_documents:number };
export const deleteDocument = async (f:string) => (await api.delete(`/documents/${encodeURIComponent(f)}`)).data;
export const getStats       = async () => (await api.get("/stats")).data       as Stats;

export const listConversations  = async () => (await api.get("/conversations")).data             as Conversation[];
export const createConversation = async () => (await api.post("/conversations")).data            as Conversation;
export const getMessages        = async (id:number) => (await api.get(`/conversations/${id}/messages`)).data as ConvoMessage[];
export const addMessage         = async (id:number, role:string, content:string, sources:any[]=[],confidence=0) =>
  (await api.post(`/conversations/${id}/messages`, { role, content, sources, confidence })).data;
export const deleteConversation = async (id:number) => (await api.delete(`/conversations/${id}`)).data;

export const getAdminStats     = async () => (await api.get("/admin/stats")).data     as AdminStats;
export const getAdminUsers     = async () => (await api.get("/admin/users")).data     as AdminUserRow[];
export const getAdminQueries   = async (l=50) => (await api.get(`/admin/queries?limit=${l}`)).data as AdminQueryRow[];
export const getAdminDocuments = async () => (await api.get("/admin/documents")).data as AdminDocumentRow[];
export const getAdminActivity  = async () => (await api.get("/admin/activity-timeline")).data    as ActivityPoint[];

// Admin destructive actions: delete any user's document, or a whole user account.
export const deleteAdminDocument = async (id:number) => (await api.delete(`/admin/documents/${id}`)).data as { deleted:string; id:number };
export const deleteAdminUser     = async (id:number) => (await api.delete(`/admin/users/${id}`)).data     as { deleted_user:string; id:number };
