// frontend/src/pages/Dashboard.tsx
// Complete RAG Dashboard — Professional, Unique, Feature-rich

import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Message, Document, Stats } from "../types";
import { askQuestion, uploadDocument, getDocuments, deleteDocument, getStats } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../index.css";

// ─── Unique ID generator ──────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);

// ─── Confidence Arc ───────────────────────────────────────────────────────────
function ConfidenceArc({ score }: { score: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  const label = score >= 80 ? "High" : score >= 60 ? "Medium" : "Low";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#0A0A1E", borderRadius: 10, border: "1px solid #1E1E3A" }}>
      <svg width={64} height={64} viewBox="0 0 64 64">
        <circle cx={32} cy={32} r={r} fill="none" stroke="#1E1E3A" strokeWidth={5} />
        <circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        <text x={32} y={37} textAnchor="middle" fill={color}
          style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
          {score}
        </text>
      </svg>
      <div>
        <div style={{ color, fontWeight: 700, fontSize: 14 }}>{label} Confidence</div>
        <div style={{ color: "#64748B", fontSize: 11 }}>Answer reliability score</div>
      </div>
    </div>
  );
}

// ─── Source Card ──────────────────────────────────────────────────────────────
function SourceCard({ source, index }: { source: any; index: number }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(source.relevance_score * 100);
  const color = pct >= 85 ? "#10B981" : pct >= 65 ? "#F59E0B" : "#64748B";

  return (
    <div onClick={() => setOpen(o => !o)}
      style={{
        background: "#09091C", border: `1px solid ${open ? "#6366F140" : "#1E1E3A"}`,
        borderRadius: 10, padding: "10px 14px", cursor: "pointer", marginBottom: 8,
        transition: "all 0.2s ease",
      }}
      onMouseEnter={e => { if (!open) (e.currentTarget as HTMLDivElement).style.borderColor = "#2E2E5A"; }}
      onMouseLeave={e => { if (!open) (e.currentTarget as HTMLDivElement).style.borderColor = "#1E1E3A"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{ background: "#6366F120", color: "#6366F1", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              #{index + 1}
            </span>
            <span style={{ color: "#E2E8F0", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {source.filename}
            </span>
            <span style={{ color: "#64748B", fontSize: 11, flexShrink: 0 }}>p.{source.page}</span>
          </div>
          {!open && (
            <p style={{ color: "#94A3B8", fontSize: 11, margin: 0, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {source.excerpt}
            </p>
          )}
          {open && (
            <blockquote style={{
              color: "#CBD5E1", fontSize: 12, margin: "8px 0 0", lineHeight: 1.7,
              background: "#06060F", padding: "10px 12px", borderRadius: 8,
              borderLeft: "3px solid #6366F1", fontFamily: "'JetBrains Mono', monospace", fontSize: 11
            }}>
              {source.excerpt}
            </blockquote>
          )}
        </div>
        <div style={{
          background: `${color}18`, color, borderRadius: 20, padding: "3px 10px",
          fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0
        }}>
          {pct}%
        </div>
      </div>
    </div>
  );
}

// ─── Typing Dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: "#6366F1",
          animation: `dotBounce 1.4s ${i * 0.2}s infinite ease-in-out`
        }} />
      ))}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onSuggestion }: { msg: Message; onSuggestion: (q: string) => void }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="msg-enter" style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 28 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "82%" }}>

        {/* AI avatar */}
        {!isUser && (
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0, marginTop: 2,
            background: "linear-gradient(135deg, #6366F1, #06B6D4)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            boxShadow: "0 0 12px #6366F140"
          }}>✦</div>
        )}

        <div style={{
          background: isUser ? "linear-gradient(135deg, #6366F1, #4F46E5)" : "#0D0D22",
          border: isUser ? "none" : "1px solid #1E1E3A",
          borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
          padding: "13px 17px", color: "#F1F5F9", fontSize: 14, lineHeight: 1.75,
          boxShadow: isUser ? "0 4px 20px #6366F130" : "none",
          whiteSpace: "pre-wrap", wordBreak: "break-word"
        }}>
          {msg.loading ? <TypingDots /> : msg.content}
        </div>

        {/* User avatar */}
        {isUser && (
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0, marginTop: 2,
            background: "linear-gradient(135deg, #F59E0B, #EF4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "white"
          }}>P</div>
        )}
      </div>

      {/* AI response extras */}
      {!isUser && !msg.loading && msg.content && (
        <div style={{ marginLeft: 44, marginTop: 10, maxWidth: "calc(82% - 44px)" }}>

          {/* Copy button */}
          <button onClick={copy} style={{
            background: "transparent", border: "1px solid #1E1E3A",
            borderRadius: 6, padding: "4px 10px", color: copied ? "#10B981" : "#64748B",
            fontSize: 11, marginBottom: 12, display: "flex", alignItems: "center", gap: 5
          }}>
            {copied ? "✓ Copied" : "Copy answer"}
          </button>

          {/* Confidence */}
          {msg.confidence !== undefined && msg.confidence > 0 && (
            <div style={{ marginBottom: 12 }}>
              <ConfidenceArc score={msg.confidence} />
            </div>
          )}

          {/* Sources */}
          {msg.sources && msg.sources.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#64748B", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>
                SOURCES USED ({msg.sources.length})
              </div>
              {msg.sources.map((s, i) => (
                <SourceCard key={i} source={s} index={i} />
              ))}
            </div>
          )}

          {/* Follow-up suggestions */}
          {msg.suggestions && msg.suggestions.length > 0 && (
            <div>
              <div style={{ color: "#64748B", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>
                FOLLOW-UP QUESTIONS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {msg.suggestions.map((s, i) => (
                  <button key={i} onClick={() => onSuggestion(s)} style={{
                    background: "transparent", border: "1px solid #1E1E3A",
                    borderRadius: 20, padding: "6px 14px", color: "#94A3B8",
                    fontSize: 12, transition: "all 0.2s ease"
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366F1"; (e.currentTarget as HTMLButtonElement).style.color = "#6366F1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1E1E3A"; (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8"; }}
                  >↗ {s}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${drag ? "#6366F1" : "#1E1E3A"}`,
        borderRadius: 12, padding: "18px 16px", textAlign: "center", cursor: "pointer",
        background: drag ? "#6366F108" : "transparent", transition: "all 0.2s ease", marginBottom: 16
      }}
    >
      <input ref={ref} type="file" accept=".pdf,.txt" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
      <div style={{ fontSize: 22, marginBottom: 6 }}>📂</div>
      <div style={{ color: "#94A3B8", fontSize: 12 }}>Drop PDF or TXT here</div>
      <div style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>or click to browse</div>
    </div>
  );
}

// ─── Upload Progress ──────────────────────────────────────────────────────────
function UploadProgress({ filename, progress, done }: { filename: string; progress: number; done: boolean }) {
  return (
    <div style={{ background: "#0A0A1E", border: "1px solid #1E1E3A", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#94A3B8", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {done ? "✅ " : "⚡ "}{filename}
        </span>
        <span style={{ color: done ? "#10B981" : "#6366F1", fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
          {done ? "Done" : `${progress}%`}
        </span>
      </div>
      <div style={{ height: 3, background: "#1E1E3A", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: done ? "#10B981" : "linear-gradient(90deg, #6366F1, #06B6D4)",
          width: `${done ? 100 : progress}%`, transition: "width 0.3s ease"
        }} />
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([{
    id: uid(), role: "assistant", timestamp: new Date(),
    content: `Hello${user ? `, ${user.full_name.split(" ")[0]}` : ""}! I'm your document intelligence assistant powered by Gemini. Upload PDF or TXT documents, then ask me anything — I'll find precise answers with exact sources and confidence scores.`,
  }]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [uploads, setUploads] = useState<{ filename: string; progress: number; done: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"docs" | "stats">("docs");
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault(); inputRef.current?.focus();
      }
      if (e.key === "Escape") inputRef.current?.blur();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Load initial data
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data.documents);
    } catch { setDocuments([]); }
  };

  const loadStats = async () => {
    try {
      const s = await getStats();
      setStats(s);
    } catch { }
  };

  const handleUpload = async (file: File) => {
    const entry = { filename: file.name, progress: 0, done: false };
    setUploads(prev => [entry, ...prev]);
    setError(null);

    try {
      await uploadDocument(file, (pct) => {
        setUploads(prev => prev.map(u => u.filename === file.name ? { ...u, progress: pct } : u));
      });
      setUploads(prev => prev.map(u => u.filename === file.name ? { ...u, done: true } : u));
      await loadDocuments();
      await loadStats();
    } catch (e: any) {
      setError(`Upload failed: ${e.response?.data?.detail || e.message}`);
      setUploads(prev => prev.filter(u => u.filename !== file.name));
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteDocument(filename);
      setDocuments(prev => prev.filter(d => d.filename !== filename));
      await loadStats();
    } catch (e: any) {
      setError(`Delete failed: ${e.message}`);
    }
  };

  const sendMessage = useCallback(async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;

    setInput("");
    setError(null);
    setLoading(true);

    // Add user message
    const userMsg: Message = { id: uid(), role: "user", content: q, timestamp: new Date() };
    // Add loading placeholder
    const loadingId = uid();
    const loadingMsg: Message = { id: loadingId, role: "assistant", content: "", timestamp: new Date(), loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    try {
      const result = await askQuestion(q);
      // Replace loading with real response
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? {
          id: loadingId, role: "assistant" as const, timestamp: new Date(),
          content: result.answer,
          sources: result.sources,
          confidence: result.confidence,
          suggestions: result.suggestions,
        } : m
      ));
    } catch (e: any) {
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? {
          id: loadingId, role: "assistant" as const, timestamp: new Date(),
          content: `❌ Error: ${e.response?.data?.detail || e.message || "Something went wrong. Is the backend running?"}`,
        } : m
      ));
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const clearChat = () => {
    setMessages([{
      id: uid(), role: "assistant", timestamp: new Date(),
      content: "Chat cleared. Ask me anything about your documents!",
    }]);
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rag-chat-${Date.now()}.txt`;
    a.click();
  };

  const promptSuggestions = [
    "What are the main risk factors?",
    "Summarize the key findings",
    "What compliance rules apply?",
    "Who are the key stakeholders?",
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 280, background: "#0A0A1A", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "linear-gradient(135deg, #6366F1, #06B6D4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: "0 0 16px #6366F140"
            }}>✦</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>DocuMind</div>
              <div style={{ color: "var(--text-dim)", fontSize: 10 }}>Gemini · Pinecone · RAG</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "10px 10px 0", gap: 4 }}>
          {(["docs", "stats"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "7px 0",
              background: tab === t ? "var(--surface2)" : "transparent",
              borderRadius: 8, color: tab === t ? "var(--text)" : "var(--text-dim)",
              fontSize: 12, fontWeight: 600, textTransform: "capitalize"
            }}>{t === "docs" ? "Documents" : "Analytics"}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 10 }}>
          {tab === "docs" ? (
            <>
              <UploadZone onUpload={handleUpload} />

              {/* Upload progress items */}
              {uploads.map((u, i) => (
                <UploadProgress key={i} filename={u.filename} progress={u.progress} done={u.done} />
              ))}

              {/* Error */}
              {error && (
                <div style={{ background: "#EF444415", border: "1px solid #EF444430", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                  <div style={{ color: "#EF4444", fontSize: 12 }}>{error}</div>
                </div>
              )}

              {/* Document list */}
              <div style={{ color: "var(--text-dim)", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>
                DOCUMENTS ({documents.length})
              </div>

              {documents.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-dim)", fontSize: 12 }}>
                  No documents yet.<br />Upload a PDF or TXT to start.
                </div>
              )}

              {documents.map((doc, i) => (
                <div key={i} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "10px 12px", marginBottom: 8,
                  transition: "border-color 0.2s"
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-hover)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>
                          {doc.filename.endsWith(".pdf") ? "📄" : "📝"}
                        </span>
                        <span style={{
                          background: "#10B98120", color: "#10B981", borderRadius: 4,
                          padding: "1px 6px", fontSize: 9, fontWeight: 700
                        }}>READY</span>
                      </div>
                      <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 600, wordBreak: "break-word" }}>
                        {doc.filename}
                      </div>
                      <div style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 3 }}>
                        {doc.chunks} chunks indexed
                      </div>
                    </div>
                    <button onClick={() => handleDelete(doc.filename)} style={{
                      background: "transparent", border: "1px solid transparent", borderRadius: 6,
                      color: "var(--text-dim)", fontSize: 16, padding: "2px 6px", flexShrink: 0
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#EF444430"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
                      title="Delete document"
                    >×</button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            /* Stats tab */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Documents", value: documents.length, color: "#6366F1", icon: "📁" },
                { label: "Total Chunks", value: stats?.total_chunks ?? 0, color: "#06B6D4", icon: "🧩" },
                { label: "Questions Asked", value: messages.filter(m => m.role === "user").length, color: "#F59E0B", icon: "❓" },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: "var(--text-dim)", fontSize: 11, marginBottom: 4 }}>{s.icon} {s.label}</div>
                      <div style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                        {s.value}
                      </div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {s.icon}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ color: "var(--text-dim)", fontSize: 11, marginBottom: 8 }}>🤖 AI Model</div>
                <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>Gemini 3.5 Flash</div>
                <div style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 4 }}>gemini-embedding-001</div>
                
              </div>
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ color: "var(--text-dim)", fontSize: 11 }}>
            Press <kbd>/</kbd> to focus · <kbd>Esc</kbd> to blur
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "14px 24px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--bg)", flexShrink: 0
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Document Intelligence</div>
            <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
              {documents.length} documents · {stats?.total_chunks ?? 0} chunks · Gemini 1.5 Flash
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

            {user?.role === "admin" && (
              <Link to="/admin" style={{
                background: "#6366F115", border: "1px solid #6366F140",
                borderRadius: 8, padding: "6px 14px", color: "#6366F1",
                fontSize: 12, fontWeight: 600, textDecoration: "none",
                display: "flex", alignItems: "center", gap: 6
              }}>⚙ Admin Panel</Link>
            )}

            {[
              { label: "Export", action: exportChat },
              { label: "Clear", action: clearChat },
            ].map(b => (
              <button key={b.label} onClick={b.action} style={{
                background: "transparent", border: "1px solid var(--border)",
                borderRadius: 8, padding: "6px 14px", color: "var(--text-dim)"
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366F1"; (e.currentTarget as HTMLButtonElement).style.color = "#6366F1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; }}
              >{b.label}</button>
            ))}

            <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 4px" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div title={user?.email} style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0
              }}>
                {user?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <button onClick={() => { logout(); navigate("/login"); }} style={{
                background: "transparent", border: "1px solid var(--border)",
                borderRadius: 8, padding: "6px 12px", color: "var(--text-dim)", fontSize: 12
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#EF4444"; (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; }}
              >Logout</button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>

          {/* Welcome state */}
          {messages.length <= 1 && documents.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0 40px", animation: "fadeIn 0.5s ease" }}>
              <div style={{ fontSize: 56, marginBottom: 20, filter: "drop-shadow(0 0 20px #6366F160)" }}>✦</div>
              <h2 className="gradient-text" style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
                Document Intelligence Platform
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 400, margin: "0 auto 32px" }}>
                Upload your documents, then ask questions in plain English. Powered by Gemini AI with semantic search.
              </p>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, maxWidth: 380, margin: "0 auto", textAlign: "left" }}>
                <div style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 12 }}>GET STARTED</div>
                {["1. Upload a PDF or TXT file using the sidebar", "2. Wait for it to be processed (a few seconds)", "3. Ask any question about your document"].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, color: "var(--text-muted)", fontSize: 13 }}>
                    <span style={{ color: "#6366F1", fontWeight: 700 }}>→</span> {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt suggestions when docs are loaded */}
          {messages.length === 1 && documents.length > 0 && (
            <div style={{ marginBottom: 32, animation: "fadeIn 0.5s ease" }}>
              <div style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 12 }}>
                TRY ASKING
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {promptSuggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 20, padding: "8px 16px", color: "var(--text-muted)", fontSize: 13
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366F1"; (e.currentTarget as HTMLButtonElement).style.color = "#6366F1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                  >✦ {s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} onSuggestion={sendMessage} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0 }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "12px 14px",
            transition: "border-color 0.2s ease"
          }}
            onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = "#6366F1"}
            onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
          >
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask anything from your documents... (/ to focus, Enter to send)"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "var(--text)", fontSize: 14, lineHeight: 1.6, resize: "none",
                maxHeight: 120, overflow: "auto", minHeight: 22
              }}
              rows={1}
            />
            <button onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #6366F1, #4F46E5)"
                  : "var(--surface2)",
                color: "white", fontSize: 18, display: "flex",
                alignItems: "center", justifyContent: "center",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                boxShadow: input.trim() && !loading ? "0 4px 12px #6366F140" : "none",
                transition: "all 0.2s ease"
              }}
            >
              {loading ? (
                <div style={{ width: 16, height: 16, border: "2px solid #6366F1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              ) : "↑"}
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 4px 0" }}>
            <span style={{ color: "var(--text-dim)", fontSize: 11 }}>↵ Send · ⇧↵ New line</span>
            <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
              {loading ? "⚡ Searching your documents..." : `${documents.length} docs ready`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
