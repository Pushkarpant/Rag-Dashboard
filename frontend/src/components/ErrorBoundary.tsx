import { Component, ErrorInfo, ReactNode } from "react";

/**
 * Catches render/runtime errors anywhere in the tree so a single component
 * throwing (e.g. on a hard refresh of a data page) shows a friendly, recoverable
 * screen instead of a white "app crashed" page. Also surfaces the real error text.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a console trace for debugging.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg)", padding: 24 }}>
        <div className="scale-in" style={{ maxWidth: 460, width: "100%", textAlign: "center",
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
          padding: "34px 28px", boxShadow: "0 30px 80px #0000002e" }}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>😵‍💫</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
            Something went wrong
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
            The page hit an unexpected error. You can reload — your data is safe.
          </p>
          <pre style={{ textAlign: "left", background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "var(--red)",
            overflow: "auto", maxHeight: 140, marginBottom: 18,
            fontFamily: "'JetBrains Mono',monospace", whiteSpace: "pre-wrap" }}>
            {this.state.error.message || String(this.state.error)}
          </pre>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="press" onClick={() => window.location.reload()} style={{
              padding: "10px 22px", borderRadius: 10, background: "var(--grad-btn)",
              color: "#fff", fontWeight: 700, fontSize: 13 }}>
              Reload page
            </button>
            <button className="press" onClick={() => { window.location.href = "/dashboard"; }} style={{
              padding: "10px 22px", borderRadius: 10, background: "transparent",
              border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
