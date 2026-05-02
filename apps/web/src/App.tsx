import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Compose } from "./components/Compose";
import { Scheduled } from "./components/Scheduled";
import { Published } from "./components/Published";
import { Comments } from "./components/Comments";
import { Settings } from "./components/Settings";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const tabs: { to: string; label: string; icon: string }[] = [
  { to: "/post", label: "Compose", icon: "✍️" },
  { to: "/schedule", label: "Scheduled", icon: "📅" },
  { to: "/published", label: "Published", icon: "✅" },
  { to: "/comments", label: "Comments", icon: "💬" },
  { to: "/settings", label: "Settings", icon: "⚙️" }
];

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshScheduled, setRefreshScheduled] = useState(0);

  const callbackHint = useMemo(() => {
    if (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")) {
      return `${apiBaseUrl}/auth/threads/callback`;
    }
    return `${window.location.origin}${apiBaseUrl}/auth/threads/callback`;
  }, []);

  // Handle OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("connected") === "true") {
      navigate("/post", { replace: true });
    }
    if (params.get("error")) {
      alert(`Auth error: ${params.get("error")}`);
      navigate("/post", { replace: true });
    }
  }, [location.search, navigate]);

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
            <NavLink
              key={tab.to}
              to={tab.to}
              style={{
                padding: "12px 16px",
                border: "none",
                background: location.pathname === tab.to ? "#fff" : "transparent",
                borderBottom: location.pathname === tab.to ? "3px solid #1f2937" : "3px solid transparent",
                cursor: "pointer",
                fontSize: "0.95em",
                fontWeight: location.pathname === tab.to ? "600" : "400",
                whiteSpace: "nowrap",
                textDecoration: "none",
                color: "inherit",
                display: "inline-block"
              }}
            >
              {tab.icon} {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
        <Routes>
          <Route
            path="/post"
            element={
              <Compose
                apiBaseUrl={apiBaseUrl}
                onDone={() => {
                  setRefreshScheduled((prev) => prev + 1);
                  setTimeout(() => navigate("/schedule"), 1000);
                }}
              />
            }
          />
          <Route path="/compose" element={<Navigate to="/post" replace />} />
          <Route path="/schedule" element={<Scheduled apiBaseUrl={apiBaseUrl} key={`${refreshScheduled}-${location.key}`} />} />
          <Route path="/scheduled" element={<Navigate to="/schedule" replace />} />
          <Route path="/scedule" element={<Navigate to="/schedule" replace />} />
          <Route path="/published" element={<Published apiBaseUrl={apiBaseUrl} />} />
          <Route path="/comments" element={<Comments apiBaseUrl={apiBaseUrl} />} />
          <Route path="/settings" element={<Settings apiBaseUrl={apiBaseUrl} />} />
          <Route path="/" element={<Navigate to="/post" replace />} />
          <Route path="*" element={<Navigate to="/post" replace />} />
        </Routes>
      </div>
    </main>
  );
}

export function App() {
  return <AppLayout />;
}
