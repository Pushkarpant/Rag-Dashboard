// frontend/src/pages/AdminPanel.tsx
import { useState, useEffect, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAdminStats, getAdminUsers, getAdminQueries, getAdminDocuments, getAdminActivity } from "../services/api";
import { AdminStats, AdminUserRow, AdminQueryRow, AdminDocumentRow, ActivityPoint } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useCountUp } from "../hooks/useCountUp";

type Tab = "overview" | "users" | "queries" | "documents";

function KPI({ label, value, icon, color, sub, index = 0, decimals = 0, prefix = "", suffix = "" }:
  { label: string; value: number; icon: string; color: string; sub?: string; index?: number; decimals?: number; prefix?: string; suffix?: string }) {
  const shown = useCountUp(value, { duration: 1100, decimals });
  return (
    <div className="fade-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", flex: "1 1 160px", minWidth: 150, position: "relative", overflow: "hidden", transition: "border-color .2s, transform .2s, box-shadow .2s", animationDelay: `${index * 70}ms`, opacity: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = color + "60"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 30px ${color}20`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <span style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{label.toUpperCase()}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
      </div>
      <div style={{ color, fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{prefix}{shown}{suffix}</div>
      {sub && <div style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const thS: CSSProperties = { textAlign: "left", padding: "10px 14px", color: "var(--text-dim)", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const tdS: CSSProperties = { padding: "11px 14px", color: "var(--text)", fontSize: 13, borderBottom: "1px solid var(--surface2)", verticalAlign: "middle" };

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ background: color + "18", color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{text}</span>;
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// On-brand sage palette. Confidence buckets keep a semantic ramp
// (sage = high, gold = medium, clay-red = low) but stay within the brand.
const PIE_COLORS = ["#54c750", "#B08430", "#BC5646"];
// Confidence → brand color (shared by pie, badges, tables)
const confColor = (c: number) => (c >= 70 ? "#54c750" : c >= 50 ? "#B08430" : "#BC5646");

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [queries, setQueries] = useState<AdminQueryRow[]>([]);
  const [docs, setDocs] = useState<AdminDocumentRow[]>([]);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminUsers(), getAdminQueries(50), getAdminDocuments(), getAdminActivity()])
      .then(([s, u, q, d, a]) => { setStats(s); setUsers(u); setQueries(q); setDocs(d); setActivity(a); })
      .catch(e => setError(e.response?.data?.detail || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const confBuckets = queries.length ? [
    { name: "High (70+)", value: queries.filter(q => q.confidence >= 70).length },
    { name: "Medium (50–69)", value: queries.filter(q => q.confidence >= 50 && q.confidence < 70).length },
    { name: "Low (<50)", value: queries.filter(q => q.confidence < 50).length },
  ] : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter',sans-serif", color: "var(--text)" }}>

      {/* Top bar */}
      <div style={{ padding: "13px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg)", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/dashboard" style={{ color: "var(--text-dim)", fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>← Dashboard</Link>
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, boxShadow: "0 0 12px #54c75055" }}>⚙</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Admin Panel</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{user?.email}</div>
          <div style={{ background: "#54c75022", color: "#54c750", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>ADMIN</div>
          <button onClick={() => { logout(); navigate("/"); }} title="Log out"
            style={{ background: "#e0685614", border: "1px solid #e0685655", borderRadius: 8, padding: "6px 13px", color: "#e06856", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all .2s" }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#e06856"; b.style.color = "#fff"; b.style.borderColor = "#e06856"; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#e0685614"; b.style.color = "#e06856"; b.style.borderColor = "#e0685655"; }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>⏻</span> Logout</button>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: 1280, margin: "0 auto" }}>
        {error && <div style={{ background: "#EF444415", border: "1px solid #EF444430", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#EF4444", fontSize: 13 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 14px" }} />
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Loading platform analytics…</div>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }} className="kpi-wrap">
              <KPI index={0} label="Users"        value={stats?.total_users ?? 0}      icon="👥" color="#54c750" />
              <KPI index={1} label="Documents"    value={stats?.total_documents ?? 0}   icon="📁" color="#6fd96b" />
              <KPI index={2} label="Questions"    value={stats?.total_queries ?? 0}     icon="❓" color="#B08430" />
              <KPI index={3} label="Chunks"       value={stats?.total_chunks ?? 0}      icon="🧩" color="#3aa336" />
              <KPI index={4} label="Avg Conf."    value={stats?.avg_confidence ?? 0}    icon="🎯" color="#54c750" decimals={1} suffix="%" />
              <KPI index={5} label="Avg Response" value={Math.round(stats?.avg_response_time_ms ?? 0)} icon="⚡" color="#6fd96b" suffix="ms" />
            </div>

            {/* Charts row */}
            <div className="fade-up admin-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 24, animationDelay: "220ms", opacity: 0 }}>
              {/* Activity chart */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 8px" }}>
                <div style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Query Activity — Last 14 Days</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={activity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#54c750" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#54c750" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "var(--text-muted)" }} itemStyle={{ color: "#54c750" }} />
                    <Area type="monotone" dataKey="queries" stroke="#54c750" strokeWidth={2} fill="url(#aGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Confidence pie */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600, marginBottom: 16, alignSelf: "flex-start" }}>Confidence Distribution</div>
                {confBuckets.length > 0 ? (
                  <>
                    <PieChart width={160} height={160}>
                      <Pie data={confBuckets} cx={80} cy={80} innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                        {confBuckets.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                    </PieChart>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "stretch", marginTop: 8 }}>
                      {confBuckets.map((b, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i] }} />
                            <span style={{ color: "var(--text-muted)" }}>{b.name}</span>
                          </div>
                          <span style={{ color: "var(--text)", fontWeight: 600 }}>{b.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: "var(--text-dim)", fontSize: 12, margin: "auto" }}>No data yet</div>
                )}
              </div>
            </div>

            {/* Tab nav */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, width: "fit-content" }}>
              {(["overview", "users", "queries", "documents"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)} className="press" style={{
                  padding: "7px 16px", background: tab === t ? "var(--surface2)" : "transparent",
                  borderRadius: 7, color: tab === t ? "var(--text)" : "var(--text-dim)",
                  fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                  border: tab === t ? "1px solid var(--border)" : "1px solid transparent",
                  boxShadow: tab === t ? "0 2px 10px #54c75020" : "none"
                }}>{t}</button>
              ))}
            </div>

            {/* Overview */}
            {tab === "overview" && (
              <div key="overview" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="admin-grid fade-in">
                {[
                  { title: "Recent Questions", rows: queries.slice(0, 8), render: (q: AdminQueryRow) => (
                    <div key={q.id} style={{ padding: "11px 14px", borderBottom: "1px solid var(--surface2)" }}>
                      <div style={{ color: "var(--text)", fontSize: 13, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-dim)", fontSize: 11 }}>
                        <span>{q.user_email}</span><span>{timeAgo(q.created_at)}</span>
                      </div>
                    </div>
                  )},
                  { title: "Recent Uploads", rows: docs.slice(0, 8), render: (d: AdminDocumentRow) => (
                    <div key={d.id} style={{ padding: "11px 14px", borderBottom: "1px solid var(--surface2)" }}>
                      <div style={{ color: "var(--text)", fontSize: 13, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {d.filename}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-dim)", fontSize: 11 }}>
                        <span>{d.owner_email} · {d.chunks_count} chunks</span><span>{timeAgo(d.uploaded_at)}</span>
                      </div>
                    </div>
                  )},
                ].map((panel, pi) => (
                  <div key={pi} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{panel.title}</div>
                    <div style={{ maxHeight: 380, overflow: "auto" }}>
                      {/* @ts-ignore */}
                      {panel.rows.length > 0 ? panel.rows.map(panel.render) : <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No data yet</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Users */}
            {tab === "users" && (
              <div key="users" className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={thS}>Name</th><th style={thS}>Email</th><th style={thS}>Role</th>
                    <th style={thS}>Docs</th><th style={thS}>Queries</th><th style={thS}>Joined</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={tdS}>{u.full_name}</td>
                        <td style={tdS}>{u.email}</td>
                        <td style={tdS}><Badge text={u.role} color={u.role === "admin" ? "#54c750" : "#8A8A7E"} /></td>
                        <td style={tdS}>{u.documents}</td>
                        <td style={tdS}>{u.queries}</td>
                        <td style={{ ...tdS, color: "var(--text-dim)" }}>{timeAgo(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>No users yet</div>}
              </div>
            )}

            {/* Queries */}
            {tab === "queries" && (
              <div key="queries" className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={thS}>Question</th><th style={thS}>User</th>
                    <th style={thS}>Confidence</th><th style={thS}>Chunks</th>
                    <th style={thS}>Time</th><th style={thS}>When</th>
                  </tr></thead>
                  <tbody>
                    {queries.map(q => (
                      <tr key={q.id}>
                        <td style={{ ...tdS, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question}</td>
                        <td style={tdS}>{q.user_email}</td>
                        <td style={tdS}><Badge text={`${q.confidence}%`} color={confColor(q.confidence)} /></td>
                        <td style={tdS}>{q.chunks_used}</td>
                        <td style={{ ...tdS, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{q.response_time_ms}ms</td>
                        <td style={{ ...tdS, color: "var(--text-dim)" }}>{timeAgo(q.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {queries.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>No questions yet</div>}
              </div>
            )}

            {/* Documents */}
            {tab === "documents" && (
              <div key="documents" className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={thS}>Filename</th><th style={thS}>Owner</th>
                    <th style={thS}>Chunks</th><th style={thS}>Uploaded</th>
                  </tr></thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id}>
                        <td style={tdS}>📄 {d.filename}</td>
                        <td style={tdS}>{d.owner_email}</td>
                        <td style={tdS}>{d.chunks_count}</td>
                        <td style={{ ...tdS, color: "var(--text-dim)" }}>{timeAgo(d.uploaded_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {docs.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>No documents yet</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
