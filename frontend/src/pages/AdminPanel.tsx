// frontend/src/pages/AdminPanel.tsx
// Platform-wide analytics — visible only to role="admin" (enforced both
// by ProtectedRoute on the frontend and get_current_admin on the backend).

import { useState, useEffect, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAdminStats, getAdminUsers, getAdminQueries, getAdminDocuments, getAdminActivity
} from "../services/api";
import { AdminStats, AdminUserRow, AdminQueryRow, AdminDocumentRow, ActivityPoint } from "../types";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

type Tab = "overview" | "users" | "queries" | "documents";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div style={{
      background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 14,
      padding: "18px 20px", flex: "1 1 180px", minWidth: 160
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <span style={{ color: "#64748B", fontSize: 12, fontWeight: 600 }}>{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15
        }}>{icon}</div>
      </div>
      <div style={{ color, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      background: `${color}18`, color, borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5
    }}>{text}</span>
  );
}

// ─── Table shell ──────────────────────────────────────────────────────────────
const thStyle: CSSProperties = {
  textAlign: "left", padding: "10px 14px", color: "#64748B",
  fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
  borderBottom: "1px solid #1E1E3A"
};
const tdStyle: CSSProperties = {
  padding: "12px 14px", color: "#E2E8F0", fontSize: 13, borderBottom: "1px solid #14142E"
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [queries, setQueries] = useState<AdminQueryRow[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentRow[]>([]);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u, q, d, a] = await Promise.all([
          getAdminStats(), getAdminUsers(), getAdminQueries(50),
          getAdminDocuments(), getAdminActivity()
        ]);
        setStats(s); setUsers(u); setQueries(q); setDocuments(d); setActivity(a);
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#06060F", fontFamily: "'Inter', sans-serif", color: "#F1F5F9" }}>

      {/* Top bar */}
      <div style={{
        padding: "14px 28px", borderBottom: "1px solid #1E1E3A",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/" style={{
            color: "#64748B", fontSize: 13, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6
          }}>← Back to Dashboard</Link>
          <div style={{ width: 1, height: 18, background: "#1E1E3A" }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>⚙ Admin Panel</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#64748B", fontSize: 12 }}>{user?.email}</span>
          <button onClick={() => { logout(); navigate("/login"); }} style={{
            background: "transparent", border: "1px solid #1E1E3A",
            borderRadius: 8, padding: "6px 12px", color: "#64748B", fontSize: 12
          }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>

        {error && (
          <div style={{ background: "#EF444415", border: "1px solid #EF444430", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#EF4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#64748B" }}>
            Loading platform analytics...
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <KPICard label="Total Users" value={stats?.total_users ?? 0} icon="👥" color="#6366F1" />
              <KPICard label="Total Documents" value={stats?.total_documents ?? 0} icon="📁" color="#06B6D4" />
              <KPICard label="Total Questions" value={stats?.total_queries ?? 0} icon="❓" color="#F59E0B" />
              <KPICard label="Total Chunks" value={stats?.total_chunks ?? 0} icon="🧩" color="#10B981" />
              <KPICard label="Avg Confidence" value={`${stats?.avg_confidence ?? 0}%`} icon="🎯" color="#A855F7" />
              <KPICard label="Avg Response" value={`${stats?.avg_response_time_ms ?? 0}ms`} icon="⚡" color="#EC4899" />
            </div>

            {/* Activity Chart */}
            <div style={{ background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 14, padding: "20px 20px 8px", marginBottom: 24 }}>
              <div style={{ color: "#94A3B8", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                Query Activity — Last 14 Days
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={activity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E3A" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#94A3B8" }}
                    itemStyle={{ color: "#6366F1" }}
                  />
                  <Area type="monotone" dataKey="queries" stroke="#6366F1" strokeWidth={2} fill="url(#queryGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 10, padding: 4, width: "fit-content" }}>
              {(["overview", "users", "queries", "documents"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "7px 18px", background: tab === t ? "#1E1E3A" : "transparent",
                  borderRadius: 7, color: tab === t ? "#F1F5F9" : "#64748B",
                  fontSize: 13, fontWeight: 600, textTransform: "capitalize"
                }}>{t}</button>
              ))}
            </div>

            {/* Overview tab: recent activity from both queries + docs combined */}
            {tab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #1E1E3A", fontSize: 13, fontWeight: 600, color: "#94A3B8" }}>
                    Recent Questions
                  </div>
                  <div style={{ maxHeight: 360, overflow: "auto" }}>
                    {queries.slice(0, 8).map(q => (
                      <div key={q.id} style={{ padding: "12px 16px", borderBottom: "1px solid #14142E" }}>
                        <div style={{ color: "#E2E8F0", fontSize: 13, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.question}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 11 }}>
                          <span>{q.user_email}</span>
                          <span>{timeAgo(q.created_at)}</span>
                        </div>
                      </div>
                    ))}
                    {queries.length === 0 && <div style={{ padding: 20, color: "#64748B", fontSize: 13, textAlign: "center" }}>No questions yet</div>}
                  </div>
                </div>

                <div style={{ background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #1E1E3A", fontSize: 13, fontWeight: 600, color: "#94A3B8" }}>
                    Recent Uploads
                  </div>
                  <div style={{ maxHeight: 360, overflow: "auto" }}>
                    {documents.slice(0, 8).map(d => (
                      <div key={d.id} style={{ padding: "12px 16px", borderBottom: "1px solid #14142E" }}>
                        <div style={{ color: "#E2E8F0", fontSize: 13, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          📄 {d.filename}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 11 }}>
                          <span>{d.owner_email} · {d.chunks_count} chunks</span>
                          <span>{timeAgo(d.uploaded_at)}</span>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && <div style={{ padding: 20, color: "#64748B", fontSize: 13, textAlign: "center" }}>No documents yet</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Users tab */}
            {tab === "users" && (
              <div style={{ background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 14, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Role</th>
                      <th style={thStyle}>Documents</th>
                      <th style={thStyle}>Questions</th>
                      <th style={thStyle}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={tdStyle}>{u.full_name}</td>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}>
                          <Badge text={u.role} color={u.role === "admin" ? "#A855F7" : "#64748B"} />
                        </td>
                        <td style={tdStyle}>{u.documents}</td>
                        <td style={tdStyle}>{u.queries}</td>
                        <td style={{ ...tdStyle, color: "#64748B" }}>{timeAgo(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No users yet</div>}
              </div>
            )}

            {/* Queries tab */}
            {tab === "queries" && (
              <div style={{ background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 14, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Question</th>
                      <th style={thStyle}>User</th>
                      <th style={thStyle}>Confidence</th>
                      <th style={thStyle}>Chunks</th>
                      <th style={thStyle}>Response Time</th>
                      <th style={thStyle}>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queries.map(q => (
                      <tr key={q.id}>
                        <td style={{ ...tdStyle, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.question}
                        </td>
                        <td style={tdStyle}>{q.user_email}</td>
                        <td style={tdStyle}>
                          <Badge
                            text={`${q.confidence}%`}
                            color={q.confidence >= 80 ? "#10B981" : q.confidence >= 60 ? "#F59E0B" : "#EF4444"}
                          />
                        </td>
                        <td style={tdStyle}>{q.chunks_used}</td>
                        <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace" }}>{q.response_time_ms}ms</td>
                        <td style={{ ...tdStyle, color: "#64748B" }}>{timeAgo(q.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {queries.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No questions asked yet</div>}
              </div>
            )}

            {/* Documents tab */}
            {tab === "documents" && (
              <div style={{ background: "#0D0D22", border: "1px solid #1E1E3A", borderRadius: 14, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Filename</th>
                      <th style={thStyle}>Owner</th>
                      <th style={thStyle}>Chunks</th>
                      <th style={thStyle}>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(d => (
                      <tr key={d.id}>
                        <td style={tdStyle}>📄 {d.filename}</td>
                        <td style={tdStyle}>{d.owner_email}</td>
                        <td style={tdStyle}>{d.chunks_count}</td>
                        <td style={{ ...tdStyle, color: "#64748B" }}>{timeAgo(d.uploaded_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {documents.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No documents uploaded yet</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
