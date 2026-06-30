// frontend/src/types/index.ts

export interface Source {
  filename: string;
  page: number;
  relevance_score: number;
  excerpt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  confidence?: number;
  suggestions?: string[];
  timestamp: Date;
  loading?: boolean;
}

export interface Document {
  filename: string;
  chunks: number;
  uploaded_at?: string;
}

export interface Stats {
  total_chunks: number;
  total_documents: number;
  total_queries?: number;
  model: string;
  status: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "user" | "admin";
}

// ── Admin Panel ──────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  total_documents: number;
  total_queries: number;
  total_chunks: number;
  avg_confidence: number;
  avg_response_time_ms: number;
}

export interface AdminUserRow {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  documents: number;
  queries: number;
}

export interface AdminQueryRow {
  id: number;
  question: string;
  user_email: string;
  confidence: number;
  chunks_used: number;
  response_time_ms: number;
  created_at: string;
}

export interface AdminDocumentRow {
  id: number;
  filename: string;
  owner_email: string;
  chunks_count: number;
  uploaded_at: string;
}

export interface ActivityPoint {
  date: string;
  queries: number;
}
