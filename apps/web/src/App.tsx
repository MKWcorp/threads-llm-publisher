import { useEffect, useState, useMemo } from "react";
import { Compose } from "./components/Compose";
import { Scheduled } from "./components/Scheduled";
import { Published } from "./components/Published";
import { Comments } from "./components/Comments";
import { Settings } from "./components/Settings";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

type Tab = "compose" | "scheduled" | "published" | "comments" | "settings";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "compose", label: "Compose", icon: "✍️" },
  { id: "scheduled", label: "Scheduled", icon: "📅" },
  { id: "published", label: "Published", icon: "✅" },
  { id: "comments", label: "Comments", icon: "💬" },
  { id: "settings", label: "Settings", icon: "⚙️" }
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("compose");
  const [refreshScheduled, setRefreshScheduled] = useState(0);

  const callbackHint = useMemo(() => {
    if (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")) {
      return `${apiBaseUrl}/auth/threads/callback`;
    }
    return `${window.location.origin}${apiBaseUrl}/auth/threads/callback`;
  }, []);

  // Handle OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      window.history.replaceState({}, "", "/");
      setActiveTab("compose");
    }
    if (params.get("error")) {
      alert(`Auth error: ${params.get("error")}`);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  return (
    <main style={{ fontFamily: "Inter, Arial, sans-serif", minHeight: "100vh", background: "#fff" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #ddd", padding: "1rem", background: "#f9f9f9" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "1.5em" }}>🧵 Threads LLM Publisher</h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85em", color: "#666" }}>
            Callback: <code style={{ fontSize: "0.75em" }}>{callbackHint}</code>
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={{ borderBottom: "1px solid #ddd", background: "#f5f5f5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 16px",
                border: "none",
                background: activeTab === tab.id ? "#fff" : "transparent",
                borderBottom: activeTab === tab.id ? "3px solid #1f2937" : "3px solid transparent",
                cursor: "pointer",
                fontSize: "0.95em",
                fontWeight: activeTab === tab.id ? "600" : "400",
                whiteSpace: "nowrap"
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
        {activeTab === "compose" && (
          <Compose
            apiBaseUrl={apiBaseUrl}
            onDone={() => {
              setRefreshScheduled((prev) => prev + 1);
              setTimeout(() => setActiveTab("scheduled"), 1000);
            }}
          />
        )}
        {activeTab === "scheduled" && <Scheduled apiBaseUrl={apiBaseUrl} key={refreshScheduled} />}
        {activeTab === "published" && <Published apiBaseUrl={apiBaseUrl} />}
        {activeTab === "comments" && <Comments apiBaseUrl={apiBaseUrl} />}
        {activeTab === "settings" && <Settings apiBaseUrl={apiBaseUrl} />}
      </div>
    </main>
  );
}
