// frontend/src/pages/Dashboard.tsx
// Fixes applied: 2(SSE upload), 4(visuals), 6(chat history), 7(doc isolation label),
//                8(sidebar toggle + light/dark), 9(mobile)
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Message, Document, Conversation } from "../types";
import {
  askQuestion, uploadDocumentSSE, getDocuments, deleteDocument,
  listConversations, createConversation, getMessages, addMessage, deleteConversation
} from "../services/api";
import "../index.css";

const uid = () => Math.random().toString(36).slice(2);

// ── Confidence Arc ──────────────────────────────────────────────────────────
function ConfidenceArc({ score }: { score: number }) {
  const r = 26; const c = 2 * Math.PI * r;
  const color = score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
  const label = score >= 70 ? "High" : score >= 50 ? "Medium" : "Low";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12,
      padding:"10px 14px", background:"var(--surface2)",
      borderRadius:10, border:"1px solid var(--border)" }}>
      <svg width={60} height={60} viewBox="0 0 60 60">
        <circle cx={30} cy={30} r={r} fill="none" stroke="var(--border)" strokeWidth={5}/>
        <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${(score/100)*c} ${c}`} strokeLinecap="round"
          transform="rotate(-90 30 30)"
          style={{transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)",
                  filter:`drop-shadow(0 0 6px ${color}80)`}}/>
        <text x={30} y={35} textAnchor="middle" fill={color}
          style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{score}</text>
      </svg>
      <div>
        <div style={{color,fontWeight:700,fontSize:13}}>{label} Confidence</div>
        <div style={{color:"var(--text-dim)",fontSize:11}}>Answer reliability</div>
      </div>
    </div>
  );
}

// ── Source Card ─────────────────────────────────────────────────────────────
function SourceCard({ source, index }: { source: any; index: number }) {
  const [open, setOpen] = useState(false);
  const pct = source.display_score ?? Math.round((source.relevance_score ?? 0) * 100);
  const col = pct >= 70 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#64748B";
  return (
    <div onClick={() => setOpen(o=>!o)} style={{
      background:"var(--surface2)", border:`1px solid ${open?"var(--primary)":"var(--border)"}`,
      borderRadius:10, padding:"10px 14px", cursor:"pointer", marginBottom:8,
      transition:"all .2s" }}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <span style={{background:"#6366F120",color:"var(--primary)",borderRadius:4,
              padding:"1px 7px",fontSize:10,fontWeight:700,flexShrink:0}}>#{index+1}</span>
            <span style={{color:"var(--text)",fontSize:12,fontWeight:600,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{source.filename}</span>
            <span style={{color:"var(--text-dim)",fontSize:11,flexShrink:0}}>p.{source.page}</span>
          </div>
          <p style={{color:"var(--text-muted)",fontSize:11,margin:0,lineHeight:1.5,
            ...(open?{}:{overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"})}}>
            {source.excerpt}
          </p>
          {open && (
            <blockquote style={{color:"var(--text-muted)",fontSize:11,margin:"8px 0 0",lineHeight:1.7,
              background:"var(--bg)",padding:"8px 10px",borderRadius:6,
              borderLeft:"3px solid var(--primary)",fontFamily:"'JetBrains Mono',monospace"}}>
              "{source.excerpt}"
            </blockquote>
          )}
        </div>
        <span style={{background:`${col}18`,color:col,borderRadius:20,
          padding:"3px 10px",fontSize:11,fontWeight:700,
          fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{pct}%</span>
      </div>
    </div>
  );
}

// ── Typing Dots ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{display:"flex",gap:5,alignItems:"center",padding:"4px 0"}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{width:8,height:8,borderRadius:"50%",background:"var(--primary)",
          animation:`dotBounce 1.4s ${i*.2}s infinite ease-in-out`}}/>
      ))}
    </div>
  );
}

// ── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, onSuggestion }: { msg: Message; onSuggestion: (q:string)=>void }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div className="msg-enter" style={{display:"flex",flexDirection:"column",
      alignItems:isUser?"flex-end":"flex-start",marginBottom:28}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}} className="msg-max-w"
        css-hack="" data-maxw="82%">
        <div style={{maxWidth:"82%",display:"flex",gap:10,alignItems:"flex-start"}}>
          {!isUser && (
            <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,marginTop:2,
              background:"linear-gradient(135deg,#6366F1,#06B6D4)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,
              boxShadow:"0 0 12px #6366F140",animation:msg.loading?"pulse 2s infinite":undefined}}>✦</div>
          )}
          <div style={{
            background:isUser?"linear-gradient(135deg,#6366F1,#4F46E5)":"var(--surface)",
            border:isUser?"none":"1px solid var(--border)",
            borderRadius:isUser?"18px 18px 4px 18px":"4px 18px 18px 18px",
            padding:"13px 17px",color:"var(--text)",fontSize:14,lineHeight:1.75,
            boxShadow:isUser?"0 4px 20px #6366F130":"none",
            whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
            {msg.loading ? <TypingDots/> : msg.content}
          </div>
          {isUser && (
            <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,marginTop:2,
              background:"linear-gradient(135deg,#F59E0B,#EF4444)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:13,fontWeight:700,color:"white"}}>
              {/* first letter of user name handled by parent */}
              P
            </div>
          )}
        </div>
      </div>

      {!isUser && !msg.loading && msg.content && (
        <div style={{marginLeft:44,marginTop:10,maxWidth:"calc(82% - 44px)"}}>
          <button onClick={copy} style={{background:"transparent",
            border:"1px solid var(--border)",borderRadius:6,padding:"4px 10px",
            color:copied?"#10B981":"var(--text-dim)",fontSize:11,marginBottom:10,
            display:"flex",alignItems:"center",gap:5}}>
            {copied?"✓ Copied":"Copy answer"}
          </button>
          {msg.confidence !== undefined && msg.confidence > 0 && (
            <div style={{marginBottom:12}}><ConfidenceArc score={msg.confidence}/></div>
          )}
          {msg.sources && msg.sources.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{color:"var(--text-dim)",fontSize:10,fontWeight:700,
                letterSpacing:1.2,marginBottom:8}}>SOURCES ({msg.sources.length})</div>
              {msg.sources.map((s,i)=><SourceCard key={i} source={s} index={i}/>)}
            </div>
          )}
          {msg.suggestions && msg.suggestions.length > 0 && (
            <div>
              <div style={{color:"var(--text-dim)",fontSize:10,fontWeight:700,
                letterSpacing:1.2,marginBottom:8}}>FOLLOW-UP</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {msg.suggestions.map((s,i)=>(
                  <button key={i} onClick={()=>onSuggestion(s)} style={{
                    background:"transparent",border:"1px solid var(--border)",
                    borderRadius:20,padding:"6px 14px",color:"var(--text-muted)",fontSize:12}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="var(--primary)";(e.currentTarget as HTMLButtonElement).style.color="var(--primary)";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="var(--border)";(e.currentTarget as HTMLButtonElement).style.color="var(--text-muted)";}}>
                    ↗ {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Upload Zone ─────────────────────────────────────────────────────────────
function UploadZone({ onFile }: { onFile:(f:File)=>void }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div onClick={()=>ref.current?.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)onFile(f);}}
      style={{border:`2px dashed ${drag?"var(--primary)":"var(--border)"}`,
        borderRadius:12,padding:"16px",textAlign:"center",cursor:"pointer",
        background:drag?"#6366F108":"transparent",transition:"all .2s",marginBottom:12}}>
      <input ref={ref} type="file" accept=".pdf,.txt" style={{display:"none"}}
        onChange={e=>{const f=e.target.files?.[0];if(f)onFile(f);}}/>
      <div style={{fontSize:20,marginBottom:4}}>📂</div>
      <div style={{color:"var(--text-muted)",fontSize:12}}>Drop PDF or TXT</div>
      <div style={{color:"var(--text-dim)",fontSize:11,marginTop:2}}>or click to browse</div>
    </div>
  );
}

// ── SSE Upload Progress ─────────────────────────────────────────────────────
function UploadProgress({ stage, pct, done }: { stage:string; pct:number; done:boolean }) {
  return (
    <div style={{background:"var(--surface2)",border:"1px solid var(--border)",
      borderRadius:10,padding:"10px 12px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{color:"var(--text-muted)",fontSize:11,flex:1,overflow:"hidden",
          textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{done?"✅ ":"⚡ "}{stage}</span>
        <span style={{color:done?"#10B981":"var(--primary)",fontSize:11,flexShrink:0,marginLeft:8}}>
          {done?"Done":pct+"%"}
        </span>
      </div>
      <div style={{height:3,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:2,transition:"width .4s ease",
          background:done?"#10B981":"linear-gradient(90deg,#6366F1,#06B6D4)",
          width:`${pct}%`}}/>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([{
    id:uid(), role:"assistant", timestamp:new Date(),
    content:`Hello${user?`, ${user.full_name.split(" ")[0]}`:""}! Upload documents and ask anything — I'll find precise answers with sources and confidence scores.`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Sidebar state — Fix 8
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"dark"|"light">("dark");
  const [sidebarTab, setSidebarTab] = useState<"chats"|"docs">("chats");

  // Documents
  const [documents, setDocuments]     = useState<Document[]>([]);
  const [uploads, setUploads]         = useState<{id:string;stage:string;pct:number;done:boolean;filename:string}[]>([]);
  const [error, setError]             = useState<string|null>(null);

  // Conversations — Fix 6
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<number|null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Apply theme — Fix 8
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Mobile: sidebar closed by default
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const h = (e:KeyboardEvent) => {
      if (e.key==="/" && document.activeElement!==inputRef.current) { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key==="Escape") inputRef.current?.blur();
    };
    window.addEventListener("keydown", h);
    return ()=>window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    listConversations().then(setConversations).catch(()=>{});
    getDocuments().then(d=>setDocuments(d.documents)).catch(()=>{});
  }, []);

  // Load conversation messages
  const loadConversation = async (id: number) => {
    setActiveConvoId(id);
    try {
      const msgs = await getMessages(id);
      setMessages(msgs.map(m => ({
        id: String(m.id), role: m.role as "user"|"assistant",
        content: m.content,
        sources: m.sources, confidence: m.confidence,
        timestamp: new Date(m.created_at)
      })));
    } catch { setError("Could not load conversation"); }
  };

  const newChat = async () => {
    try {
      const c = await createConversation();
      setConversations(prev => [c, ...prev]);
      setActiveConvoId(c.id);
      setMessages([{
        id:uid(), role:"assistant", timestamp:new Date(),
        content:"New chat started. Upload documents and ask anything!",
      }]);
    } catch { setError("Could not create chat"); }
  };

  const removeConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations(prev => prev.filter(c=>c.id!==id));
      if (activeConvoId === id) {
        setActiveConvoId(null);
        setMessages([{id:uid(),role:"assistant",timestamp:new Date(),
          content:"Select a chat or start a new one."}]);
      }
    } catch { setError("Could not delete chat"); }
  };

  // Send message
  const sendMessage = useCallback(async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput(""); setError(null); setLoading(true);

    // Create conversation if none active
    let convoId = activeConvoId;
    if (!convoId) {
      try {
        const c = await createConversation();
        setConversations(prev => [c, ...prev]);
        setActiveConvoId(c.id);
        convoId = c.id;
      } catch { /* continue without persistence */ }
    }

    const loadingId = uid();
    setMessages(prev => [
      ...prev,
      { id:uid(), role:"user", content:q, timestamp:new Date() },
      { id:loadingId, role:"assistant", content:"", timestamp:new Date(), loading:true }
    ]);

    try {
      const result = await askQuestion(q);

      setMessages(prev => prev.map(m => m.id===loadingId ? {
        id:loadingId, role:"assistant" as const, timestamp:new Date(),
        content:result.answer, sources:result.sources,
        confidence:result.confidence, suggestions:result.suggestions,
      } : m));

      // Persist both messages
      if (convoId) {
        await addMessage(convoId, "user", q);
        await addMessage(convoId, "assistant", result.answer, result.sources, result.confidence);
        // Refresh sidebar titles
        listConversations().then(setConversations).catch(()=>{});
      }
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id===loadingId ? {
        id:loadingId, role:"assistant" as const, timestamp:new Date(),
        content:`❌ ${e.response?.data?.detail || e.message || "Something went wrong. Is the backend running?"}`,
      } : m));
    } finally { setLoading(false); }
  }, [input, loading, activeConvoId]);

  // File upload — Fix 2 SSE
  const handleUpload = (file: File) => {
    const id = uid();
    setUploads(prev => [{id, stage:"Starting…", pct:0, done:false, filename:file.name}, ...prev]);
    setError(null);

    uploadDocumentSSE(
      file,
      token,
      (stage, pct) => setUploads(prev => prev.map(u => u.id===id ? {...u, stage, pct} : u)),
      (filename, chunks) => {
        setUploads(prev => prev.map(u => u.id===id ? {...u, stage:"Done!", pct:100, done:true} : u));
        getDocuments().then(d => setDocuments(d.documents)).catch(()=>{});
      },
      (msg) => { setError(msg); setUploads(prev => prev.filter(u=>u.id!==id)); }
    );
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteDocument(filename);
      setDocuments(prev => prev.filter(d=>d.filename!==filename));
    } catch (e: any) { setError(e.response?.data?.detail || "Delete failed"); }
  };

  const exportChat = () => {
    const text = messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join("\n\n---\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text],{type:"text/plain"}));
    a.download = `chat-${Date.now()}.txt`; a.click();
  };

  const SUGGESTIONS = ["What are the main risks?","Summarize the key findings","What compliance rules apply?","List all action items"];

  return (
    <div style={{display:"flex",height:"100vh",background:"var(--bg)",overflow:"hidden",position:"relative"}}>

      {/* Mobile overlay — Fix 9 */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div onClick={()=>setSidebarOpen(false)}
          style={{position:"fixed",inset:0,background:"#00000080",zIndex:40}}/>
      )}

      {/* ── SIDEBAR — Fix 6, 8, 9 ── */}
      <aside style={{
        width:"var(--sidebar-w)", flexShrink:0,
        background:"#0A0A1A", borderRight:"1px solid var(--border)",
        display:"flex", flexDirection:"column",
        transition:"transform .3s cubic-bezier(.4,0,.2,1)",
        transform: sidebarOpen ? "translateX(0)" : "translateX(calc(-1 * var(--sidebar-w)))",
        position: window.innerWidth < 768 ? "fixed" : "relative",
        zIndex:45, height:"100%"
      }}>

        {/* Logo + collapse button */}
        <div style={{padding:"16px 14px 12px",borderBottom:"1px solid var(--border)",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:8,
              background:"linear-gradient(135deg,#6366F1,#06B6D4)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:15,boxShadow:"0 0 12px #6366F140"}}>✦</div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>DocuMind</div>
              <div style={{color:"var(--text-dim)",fontSize:10}}>AI Document Intelligence</div>
            </div>
          </div>
          <button onClick={()=>setSidebarOpen(false)}
            style={{background:"transparent",border:"1px solid var(--border)",
              borderRadius:6,width:26,height:26,color:"var(--text-dim)",fontSize:14,
              display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        </div>

        {/* New chat button */}
        <div style={{padding:"10px 10px 6px"}}>
          <button onClick={newChat} style={{width:"100%",padding:"9px 0",
            background:"linear-gradient(135deg,#6366F1,#4F46E5)",
            borderRadius:8,color:"#fff",fontWeight:600,fontSize:13,
            boxShadow:"0 4px 16px #6366F130"}}>+ New Chat</button>
        </div>

        {/* Tabs: Chats | Docs */}
        <div style={{display:"flex",gap:4,padding:"6px 10px 0"}}>
          {(["chats","docs"] as const).map(t=>(
            <button key={t} onClick={()=>setSidebarTab(t)} style={{
              flex:1,padding:"6px 0",background:sidebarTab===t?"var(--surface2)":"transparent",
              borderRadius:7,color:sidebarTab===t?"var(--text)":"var(--text-dim)",
              fontSize:12,fontWeight:600,textTransform:"capitalize"}}>
              {t==="chats"?"💬 Chats":"📁 Docs"}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflow:"auto",padding:10}}>
          {/* ── Chats tab ── */}
          {sidebarTab==="chats" && (
            <>
              {conversations.length===0 && (
                <div style={{textAlign:"center",padding:"28px 0",color:"var(--text-dim)",fontSize:12}}>
                  No chats yet.<br/>Click "New Chat" to start.
                </div>
              )}
              {conversations.map(c=>(
                <div key={c.id} onClick={()=>loadConversation(c.id)}
                  style={{padding:"9px 10px",borderRadius:8,marginBottom:4,cursor:"pointer",
                    background:activeConvoId===c.id?"var(--surface2)":"transparent",
                    border:`1px solid ${activeConvoId===c.id?"var(--border)":"transparent"}`,
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    transition:"all .15s"}}
                  onMouseEnter={e=>{ if(activeConvoId!==c.id)(e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                  onMouseLeave={e=>{ if(activeConvoId!==c.id)(e.currentTarget as HTMLDivElement).style.background="transparent"; }}>
                  <div style={{minWidth:0}}>
                    <div style={{color:"var(--text)",fontSize:12,fontWeight:500,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                    <div style={{color:"var(--text-dim)",fontSize:10,marginTop:2}}>
                      {new Date(c.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button onClick={e=>removeConversation(c.id,e)}
                    style={{background:"transparent",border:"none",color:"var(--text-dim)",
                      fontSize:16,padding:"0 4px",flexShrink:0}}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color="#EF4444"}
                    onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color="var(--text-dim)"}>
                    ×
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── Docs tab ── */}
          {sidebarTab==="docs" && (
            <>
              <UploadZone onFile={handleUpload}/>
              {uploads.map(u=>(
                <UploadProgress key={u.id} stage={u.stage} pct={u.pct} done={u.done}/>
              ))}
              {error && (
                <div style={{background:"#EF444415",border:"1px solid #EF444430",
                  borderRadius:8,padding:"8px 10px",marginBottom:10,color:"#EF4444",fontSize:12}}>
                  {error}
                </div>
              )}
              <div style={{color:"var(--text-dim)",fontSize:10,fontWeight:700,
                letterSpacing:1.2,marginBottom:8}}>
                YOUR DOCUMENTS ({documents.length})
              </div>

              {/* Fix 7 — privacy label, clear explanation */}
              {documents.length > 0 && (
                <div style={{background:"#6366F110",border:"1px solid #6366F120",
                  borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:11,
                  color:"var(--text-dim)",lineHeight:1.5}}>
                  🔐 Your documents are private — only you can search and query them.
                </div>
              )}

              {documents.length===0 && (
                <div style={{textAlign:"center",padding:"20px 0",color:"var(--text-dim)",fontSize:12}}>
                  No documents yet.<br/>Upload a PDF or TXT above.
                </div>
              )}
              {documents.map((doc,i)=>(
                <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",
                  borderRadius:10,padding:"9px 11px",marginBottom:8,
                  transition:"border-color .2s"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.borderColor="var(--border-h)"}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.borderColor="var(--border)"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0,marginRight:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                        <span>{doc.filename.endsWith(".pdf")?"📄":"📝"}</span>
                        <span style={{background:"#10B98120",color:"#10B981",borderRadius:4,
                          padding:"1px 6px",fontSize:9,fontWeight:700}}>READY</span>
                      </div>
                      <div style={{color:"var(--text)",fontSize:12,fontWeight:600,wordBreak:"break-word"}}>{doc.filename}</div>
                      <div style={{color:"var(--text-dim)",fontSize:11,marginTop:2}}>{doc.chunks} chunks</div>
                    </div>
                    <button onClick={()=>handleDelete(doc.filename)}
                      style={{background:"transparent",border:"1px solid transparent",
                        borderRadius:5,color:"var(--text-dim)",fontSize:16,padding:"1px 5px",flexShrink:0}}
                      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color="#EF4444";(e.currentTarget as HTMLButtonElement).style.borderColor="#EF444430";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color="var(--text-dim)";(e.currentTarget as HTMLButtonElement).style.borderColor="transparent";}}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Sidebar footer — theme toggle Fix 8 */}
        <div style={{padding:"10px 14px",borderTop:"1px solid var(--border)"}}>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{
              flex:1,padding:"7px 0",background:"var(--surface2)",
              border:"1px solid var(--border)",borderRadius:7,
              color:"var(--text-muted)",fontSize:12}}>
              {theme==="dark"?"☀ Light":"🌙 Dark"}
            </button>
          </div>
          <div style={{color:"var(--text-dim)",fontSize:10,textAlign:"center",marginTop:8}}>
            Press <kbd>/</kbd> to focus input
          </div>
        </div>
      </aside>

      {/* ── MAIN PANEL ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",
        transition:"margin .3s"}} className="main-full">

        {/* Header */}
        <div style={{padding:"12px 20px",borderBottom:"1px solid var(--border)",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          background:"var(--bg)",flexShrink:0,gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            {/* Hamburger — Fix 8,9 */}
            <button onClick={()=>setSidebarOpen(o=>!o)}
              style={{background:"transparent",border:"1px solid var(--border)",
                borderRadius:7,width:32,height:32,color:"var(--text-muted)",fontSize:16,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {sidebarOpen?"‹":"≡"}
            </button>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:700,fontSize:15,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}} className="header-title">
                Document Intelligence
              </div>
              <div style={{color:"var(--text-dim)",fontSize:11}}>
                {documents.length} docs · {documents.reduce((s,d)=>s+d.chunks,0)} chunks
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            {user?.role==="admin" && (
              <Link to="/admin" style={{background:"#6366F115",border:"1px solid #6366F140",
                borderRadius:8,padding:"6px 12px",color:"var(--primary)",
                textDecoration:"none",fontSize:12,fontWeight:600}}>⚙ Admin</Link>
            )}
            <button onClick={exportChat} style={{background:"transparent",
              border:"1px solid var(--border)",borderRadius:8,
              padding:"6px 12px",color:"var(--text-dim)",fontSize:12}}>Export</button>
            <div style={{width:28,height:28,borderRadius:"50%",
              background:"linear-gradient(135deg,#F59E0B,#EF4444)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,fontWeight:700,color:"#fff",cursor:"default",flexShrink:0}}
              title={user?.email}>
              {user?.full_name?.[0]?.toUpperCase()||"U"}
            </div>
            <button onClick={()=>{logout();navigate("/");}}
              style={{background:"transparent",border:"1px solid var(--border)",
                borderRadius:8,padding:"6px 12px",color:"var(--text-dim)",fontSize:12}}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="#EF4444";(e.currentTarget as HTMLButtonElement).style.color="#EF4444";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="var(--border)";(e.currentTarget as HTMLButtonElement).style.color="var(--text-dim)";}}>
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflow:"auto",padding:"24px 28px"}}>

          {/* Welcome / suggestions */}
          {messages.length<=1 && documents.length===0 && (
            <div style={{textAlign:"center",padding:"50px 0 30px",animation:"fadeIn .5s ease"}}>
              <div style={{fontSize:52,marginBottom:16,animation:"float 3s ease-in-out infinite"}}>✦</div>
              <h2 className="gradient-text" style={{fontSize:22,fontWeight:800,marginBottom:10}}>
                Document Intelligence Platform
              </h2>
              <p style={{color:"var(--text-muted)",fontSize:14,maxWidth:420,margin:"0 auto 32px",lineHeight:1.7}}>
                Upload PDFs or TXT files in the sidebar, then ask questions in plain English. Answers come with sources and confidence scores.
              </p>
            </div>
          )}

          {messages.length<=1 && documents.length>0 && (
            <div style={{marginBottom:28,animation:"fadeIn .5s ease"}}>
              <div style={{color:"var(--text-dim)",fontSize:10,fontWeight:700,letterSpacing:1.2,marginBottom:10}}>
                TRY ASKING
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {SUGGESTIONS.map((s,i)=>(
                  <button key={i} onClick={()=>sendMessage(s)}
                    style={{background:"var(--surface)",border:"1px solid var(--border)",
                      borderRadius:20,padding:"8px 16px",color:"var(--text-muted)",fontSize:13}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="var(--primary)";(e.currentTarget as HTMLButtonElement).style.color="var(--primary)";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="var(--border)";(e.currentTarget as HTMLButtonElement).style.color="var(--text-muted)";}}>
                    ✦ {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg=>(
            <MessageBubble key={msg.id} msg={msg} onSuggestion={sendMessage}/>
          ))}
          <div ref={bottomRef}/>
        </div>

        {/* Input — Fix 9 mobile */}
        <div style={{padding:"14px 20px",borderTop:"1px solid var(--border)",
          background:"var(--bg)",flexShrink:0}} className="input-area">
          <div style={{display:"flex",gap:8,alignItems:"flex-end",
            background:"var(--surface)",border:"1px solid var(--border)",
            borderRadius:14,padding:"10px 12px",transition:"border-color .2s"}}
            onFocusCapture={e=>(e.currentTarget as HTMLDivElement).style.borderColor="var(--primary)"}
            onBlurCapture={e=>(e.currentTarget as HTMLDivElement).style.borderColor="var(--border)"}>
            <textarea ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
              placeholder="Ask anything from your documents…"
              rows={1} style={{flex:1,background:"transparent",border:"none",outline:"none",
                color:"var(--text)",fontSize:14,lineHeight:1.6,resize:"none",
                maxHeight:120,overflow:"auto",minHeight:22,fontFamily:"inherit"}}/>
            <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
              style={{width:36,height:36,borderRadius:9,flexShrink:0,
                background:input.trim()&&!loading
                  ?"linear-gradient(135deg,#6366F1,#4F46E5)":"var(--surface2)",
                color:"#fff",fontSize:16,display:"flex",alignItems:"center",
                justifyContent:"center",cursor:input.trim()&&!loading?"pointer":"not-allowed",
                boxShadow:input.trim()&&!loading?"0 4px 12px #6366F140":"none",transition:"all .2s"}}>
              {loading
                ? <div style={{width:14,height:14,border:"2px solid #6366F1",
                    borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                : "↑"}
            </button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 4px 0"}}>
            <span style={{color:"var(--text-dim)",fontSize:10}}>↵ Send · ⇧↵ New line</span>
            <span style={{color:"var(--text-dim)",fontSize:10}}>
              {loading ? "⚡ Searching documents…" : `${documents.length} docs ready`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
