import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
const apiBaseUrl = "http://localhost:8787";
export function App() {
    const [text, setText] = useState("Hello from Threads LLM Publisher");
    const [imageUrl, setImageUrl] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [result, setResult] = useState("Ready");
    const callbackHint = useMemo(() => `${apiBaseUrl}/auth/threads/callback`, []);
    async function connectThreads() {
        const res = await fetch(`${apiBaseUrl}/auth/threads/start`);
        const data = await res.json();
        window.location.href = data.authUrl;
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
    return (_jsxs("main", { style: { fontFamily: "Inter, Arial, sans-serif", maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }, children: [_jsx("h1", { children: "Threads LLM Publisher" }), _jsx("p", { children: "MVP single-account flow: connect, publish now, or schedule." }), _jsxs("p", { children: ["OAuth callback URI: ", _jsx("code", { children: callbackHint })] }), _jsxs("div", { style: { display: "grid", gap: 10, marginTop: 20 }, children: [_jsx("button", { onClick: connectThreads, children: "Connect Threads Account" }), _jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), rows: 5, maxLength: 500 }), _jsx("input", { value: imageUrl, onChange: (e) => setImageUrl(e.target.value), placeholder: "https://public-image-url.jpg (optional)" }), _jsxs("div", { style: { display: "flex", gap: 10 }, children: [_jsx("button", { onClick: postNow, children: "Post Now" }), _jsx("input", { type: "datetime-local", value: scheduledAt, onChange: (e) => setScheduledAt(e.target.value) }), _jsx("button", { onClick: schedulePost, disabled: !scheduledAt, children: "Schedule" })] })] }), _jsx("pre", { style: { marginTop: 20, background: "#f5f5f5", padding: 12, borderRadius: 8, overflowX: "auto" }, children: result })] }));
}
