import React, { StrictMode, Component, ErrorInfo, ReactNode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global boot diagnostic state
declare global {
  interface Window {
    __OMNISYNC_BOOT__?: {
      htmlLoaded: boolean;
      reactStarted: boolean;
      reactMounted: boolean;
      error: string | null;
      bootTimeMs?: number;
      failureCategory?: "FRONTEND_BOOT_FAILURE" | "REACT_MOUNT_FAILURE" | "API_CONNECTIVITY_FAILURE" | "CSS_ASSET_FAILURE" | "UNKNOWN_RUNTIME_FAILURE" | null;
    };
  }
}

const startTime = Date.now();
window.__OMNISYNC_BOOT__ = {
  htmlLoaded: true,
  reactStarted: false,
  reactMounted: false,
  error: null,
  failureCategory: null,
};

interface RootErrorBoundaryProps {
  children: ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  apiReachable: boolean | null;
  failureCategory: "FRONTEND_BOOT_FAILURE" | "REACT_MOUNT_FAILURE" | "API_CONNECTIVITY_FAILURE" | "CSS_ASSET_FAILURE" | "UNKNOWN_RUNTIME_FAILURE";
}

class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      apiReachable: null,
      failureCategory: "UNKNOWN_RUNTIME_FAILURE",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    const errorMsg = error.message || "";
    let category: RootErrorBoundaryState["failureCategory"] = "UNKNOWN_RUNTIME_FAILURE";

    if (errorMsg.includes("fetch") || errorMsg.includes("NetworkError") || errorMsg.includes("Failed to fetch")) {
      category = "API_CONNECTIVITY_FAILURE";
    } else if (errorMsg.includes("mount") || errorMsg.includes("createRoot") || errorMsg.includes("Target container")) {
      category = "REACT_MOUNT_FAILURE";
    } else if (errorMsg.includes("CSS") || errorMsg.includes("style") || errorMsg.includes("stylesheet")) {
      category = "CSS_ASSET_FAILURE";
    } else if (errorMsg.includes("module") || errorMsg.includes("SyntaxError") || errorMsg.includes("import")) {
      category = "FRONTEND_BOOT_FAILURE";
    }

    if (window.__OMNISYNC_BOOT__) {
      window.__OMNISYNC_BOOT__.error = errorMsg.replace(/token=[^&\s]+/gi, "token=[REDACTED]").slice(0, 300);
      window.__OMNISYNC_BOOT__.failureCategory = category;
    }

    return { hasError: true, error, failureCategory: category };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[OmniSync Root Error]", error, errorInfo);
    fetch("/api/preview-health")
      .then((res) => this.setState({ apiReachable: res.ok }))
      .catch(() => this.setState({ apiReachable: false }));
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const sanitizedError = (this.state.error?.message || "An unexpected error occurred during frontend boot.")
        .replace(/token=[^&\s]+/gi, "token=[REDACTED]")
        .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, "Bearer [REDACTED]")
        .slice(0, 300);

      // Render with inline styling so it is completely immune to CSS bundle failures
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#020617",
            color: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              backgroundColor: "#0f172a",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#f43f5e",
                }}
              />
              <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#f8fafc" }}>
                OmniSync Suite
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  backgroundColor: "rgba(244, 63, 94, 0.15)",
                  color: "#fda4af",
                  borderRadius: "6px",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                }}
              >
                {this.state.failureCategory}
              </span>
            </div>

            <div
              style={{
                padding: "14px",
                backgroundColor: "rgba(136, 19, 55, 0.3)",
                border: "1px solid rgba(225, 29, 72, 0.4)",
                borderRadius: "10px",
                fontSize: "12px",
                color: "#fecdd3",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>Frontend boot diagnostic:</div>
              <div>{sanitizedError}</div>
            </div>

            <div
              style={{
                padding: "14px",
                backgroundColor: "#020617",
                border: "1px solid #1e293b",
                borderRadius: "10px",
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ color: "#94a3b8", fontWeight: "bold", marginBottom: "4px" }}>
                Runtime Environment Diagnostics:
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Frontend Loaded:</span>
                <span style={{ color: "#34d399", fontWeight: "bold" }}>YES</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Document ReadyState:</span>
                <span style={{ color: "#38bdf8" }}>{document.readyState}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Backend Health:</span>
                <span
                  style={{
                    color: this.state.apiReachable === false ? "#f43f5e" : "#34d399",
                    fontWeight: "bold",
                  }}
                >
                  {this.state.apiReachable === null
                    ? "Checking..."
                    : this.state.apiReachable
                    ? "HEALTHY (200 OK)"
                    : "UNREACHABLE"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Origin:</span>
                <span style={{ color: "#94a3b8" }}>{window.location.origin}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Pathname:</span>
                <span style={{ color: "#94a3b8" }}>{window.location.pathname}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// App Boot Lifecycle Component
const BootLifecycleTracker: React.FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    // 1. Mark React mounted in global boot diagnostic
    if (window.__OMNISYNC_BOOT__) {
      window.__OMNISYNC_BOOT__.reactMounted = true;
      window.__OMNISYNC_BOOT__.bootTimeMs = Date.now() - startTime;
    }

    // 2. Remove the zero-dependency boot status element smoothly
    const bootStatusEl = document.getElementById("boot-status");
    if (bootStatusEl) {
      bootStatusEl.style.transition = "opacity 0.2s ease";
      bootStatusEl.style.opacity = "0";
      setTimeout(() => {
        bootStatusEl.remove();
      }, 200);
    }
  }, []);

  return <>{children}</>;
};

const rootElement = document.getElementById("root");
if (rootElement) {
  if (window.__OMNISYNC_BOOT__) {
    window.__OMNISYNC_BOOT__.reactStarted = true;
  }

  createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <BootLifecycleTracker>
          <App />
        </BootLifecycleTracker>
      </RootErrorBoundary>
    </StrictMode>
  );
} else {
  console.error("Root DOM element #root not found.");
  if (window.__OMNISYNC_BOOT__) {
    window.__OMNISYNC_BOOT__.error = "Root DOM element #root not found in document.";
    window.__OMNISYNC_BOOT__.failureCategory = "REACT_MOUNT_FAILURE";
  }
}


