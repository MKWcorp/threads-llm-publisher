import { useEffect, useMemo, useState } from "react";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export function App() {
  const [text, setText] = useState("Hello from Threads LLM Publisher");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState("Ready");
  const [connected, setConnected] = useState<boolean | null>(null);

  const callbackHint = useMemo(() => {
    if (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")) {
      return `${apiBaseUrl}/auth/threads/callback`;
    }
    return `${window.location.origin}${apiBaseUrl}/auth/threads/callback`;
  }, []);

  // Check connection status on load & handle OAuth redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      window.history.replaceState({}, "", "/");
    }
    if (params.get("error")) {
      setResult(`Auth error: ${params.get("error")}`);
      window.history.replaceState({}, "", "/");
    }
    fetch(`${apiBaseUrl}/auth/threads/status`)
      .then((r) => r.json())
      .then((d: { connected: boolean }) => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  function connectThreads() {
    window.location.href = `${apiBaseUrl}/auth/threads/start/redirect`;
  }

  async function postNow() {
    const res = await fetch(`${apiBaseUrl}/publish/now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, imageUrl: imageUrl || undefined })
    });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  }

  async function schedulePost() {
    const res = await fetch(`${apiBaseUrl}/publish/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, imageUrl: imageUrl || undefined, scheduledAt: new Date(scheduledAt).toISOString() })
    });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <main style={{ fontFamily: "Inter, Arial, sans-serif", maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Threads LLM Publisher</h1>
      <p>OAuth callback URI: <code>{callbackHint}</code></p>
      <p>Status: {connected === null ? "Checking..." : connected ? "✅ Connected to Threads" : "❌ Not connected"}</p>

      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        <button onClick={connectThreads}>{connected ? "Reconnect Threads Account" : "Connect Threads Account"}</button>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={500} />
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://public-image-url.jpg (optional)" />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={postNow}>Post Now</button>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          <button onClick={schedulePost} disabled={!scheduledAt}>Schedule</button>
        </div>
      </div>

      <pre style={{ marginTop: 20, background: "#f5f5f5", padding: 12, borderRadius: 8, overflowX: "auto" }}>{result}</pre>
    </main>
  );
}
