// frontend/src/services/api.ts

import axios from "axios";
import {
  Source, Document, Stats, User,
  AdminStats, AdminUserRow, AdminQueryRow, AdminDocumentRow, ActivityPoint
} from "../types";

const BASE = "http://localhost:8000";

const api = axios.create({ baseURL: BASE });

// Attach the JWT to every outgoing request automatically.
// This is the ONLY place auth headers are set — every service
// function below benefits without repeating itself.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rag_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever returns 401 (expired/invalid token),
// clear local auth state so the UI doesn't get stuck "logged in"
// while every request silently fails.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("rag_token");
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────

export const loginUser = async (email: string, password: string) => {
  const res = await api.post("/auth/login", { email, password });
  return res.data as { access_token: string; token_type: string; user: User };
};

export const signupUser = async (email: string, password: string, full_name: string) => {
  const res = await api.post("/auth/signup", { email, password, full_name });
  return res.data as { access_token: string; token_type: string; user: User };
};

export const getMe = async (): Promise<User> => {
  const res = await api.get("/auth/me");
  return res.data;
};

// ── RAG: ask / upload / documents ───────────────────────────────────────────

export const askQuestion = async (question: string, top_k = 5) => {
  const res = await api.post("/ask", { question, top_k });
  return res.data as {
    answer: string;
    sources: Source[];
    confidence: number;
    suggestions: string[];
    question: string;
    chunks_used: number;
  };
};

export const uploadDocument = async (file: File, onProgress?: (pct: number) => void) => {
  const form = new FormData();
  form.append("file", file);

  const res = await api.post("/documents/upload", form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return res.data;
};

export const getDocuments = async (): Promise<{
  documents: Document[]; total_chunks: number; total_documents: number;
}> => {
  const res = await api.get("/documents");
  return res.data;
};

export const deleteDocument = async (filename: string) => {
  const res = await api.delete(`/documents/${encodeURIComponent(filename)}`);
  return res.data;
};

export const getStats = async (): Promise<Stats> => {
  const res = await api.get("/stats");
  return res.data;
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getAdminStats = async (): Promise<AdminStats> =>
  (await api.get("/admin/stats")).data;

export const getAdminUsers = async (): Promise<AdminUserRow[]> =>
  (await api.get("/admin/users")).data;

export const getAdminQueries = async (limit = 50): Promise<AdminQueryRow[]> =>
  (await api.get(`/admin/queries?limit=${limit}`)).data;

export const getAdminDocuments = async (): Promise<AdminDocumentRow[]> =>
  (await api.get("/admin/documents")).data;

export const getAdminActivity = async (): Promise<ActivityPoint[]> =>
  (await api.get("/admin/activity-timeline")).data;
