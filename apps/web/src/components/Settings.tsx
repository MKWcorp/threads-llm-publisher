import { useEffect, useState } from "react";

interface SettingsProps {
  apiBaseUrl: string;
  onConnect?: () => void;
}

export function Settings({ apiBaseUrl, onConnect }: SettingsProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/threads/status`);
      const data = await res.json();
      setConnected(data.connected ?? false);
      setUserId(data.userId);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      console.error("Failed to check status:", err);
      setConnected(false);
    }
  }

  function connectThreads() {
    window.location.href = `${apiBaseUrl}/auth/threads/start/redirect`;
  }

  return (
    <div>
      <h2>Settings</h2>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}>
        <h3>Threads Account</h3>
        {connected === null ? (
          <p>⏳ Checking...</p>
        ) : connected ? (
          <>
            <p style={{ margin: "8px 0", color: "#0a7e1e" }}>✅ Connected</p>
            {userId && (
              <p style={{ margin: "8px 0", fontSize: "0.9em", color: "#666" }}>
                User ID: <code>{userId}</code>
              </p>
            )}
            {expiresAt && (
              <p style={{ margin: "8px 0", fontSize: "0.9em", color: "#666" }}>
                Token expiration: {new Date(expiresAt).toLocaleString()}
              </p>
            )}
            <button onClick={connectThreads} style={{ marginTop: 8 }}>
              🔄 Reconnect
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: "8px 0", color: "#dc2626" }}>❌ Not connected</p>
            <button onClick={connectThreads} style={{ marginTop: 8 }}>
              🔗 Connect Threads Account
            </button>
          </>
        )}
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 4 }}>
        <h3>API Information</h3>
        <p style={{ fontSize: "0.9em", color: "#666" }}>
          Base URL: <code>{apiBaseUrl}</code>
        </p>
        <p style={{ fontSize: "0.9em", color: "#666", marginTop: 8 }}>
          Saat ini menggunakan backend Express + Vite untuk web, Prisma + PostgreSQL di production.
        </p>
      </div>
    </div>
  );
}
