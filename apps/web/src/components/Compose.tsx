import { useState } from "react";

interface ComposeProps {
  apiBaseUrl: string;
  onDone?: () => void;
}

export function Compose({ apiBaseUrl, onDone }: ComposeProps) {
  const promptTemplate = `Anda adalah copywriter sosial media berbahasa Indonesia.
Buat konten untuk Threads dalam format HTML bersih.

Tujuan konten:
[ISI TUJUAN KONTEN]

Topik utama:
[ISI TOPIK]

Audiens:
[ISI AUDIENS]

Gaya bahasa:
[contoh: santai, profesional, edukatif, storytelling]

CTA (call to action):
[ISI CTA]

Batasan penting:
1. Output HARUS valid HTML saja (tanpa markdown, tanpa \`\`\`).
2. Gunakan tag sederhana: <h1>, <h2>, <p>, <ul>, <li>, <strong>, <em>.
3. Jangan gunakan script/style/iframe.
4. Bahasa Indonesia natural dan mudah dibaca.
5. Setiap paragraf maksimal 2 kalimat.
6. Target panjang 800-1500 karakter.

Struktur:
- 1 judul
- 1 pembuka
- 3-5 poin inti
- 1 penutup + CTA

Keluarkan HANYA HTML final.`;

  const [htmlInput, setHtmlInput] = useState("");
  const [parts, setParts] = useState<string[]>([]);
  const [editedParts, setEditedParts] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  async function handlePreviewSplit() {
    if (!htmlInput.trim()) {
      setResult("❌ HTML tidak boleh kosong");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/publish/preview-split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlInput })
      });
      const data = await res.json();

      if (data.error) {
        setResult(`❌ Error: ${JSON.stringify(data.error)}`);
      } else {
        setParts(data.parts);
        setEditedParts(data.parts);
        setShowSplit(true);
        setResult(`✅ Dipecah jadi ${data.count} bagian utas`);
      }
    } catch (err) {
      setResult(`❌ Network error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  async function publishNow() {
    if (!editedParts.length) {
      setResult("❌ Tidak ada bagian yang akan dipublikasi");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/publish/now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editedParts[0],
          imageUrl: imageUrl || undefined,
          parts: editedParts.length > 1 ? editedParts : undefined
        })
      });
      const data = await res.json();

      if (data.error) {
        setResult(`❌ Error: ${data.error}`);
      } else if (data.success) {
        setResult(`✅ Berhasil dipublikasikan! Post ID: ${data.postId}`);
        setHtmlInput("");
        setParts([]);
        setEditedParts([]);
        setImageUrl("");
        setShowSplit(false);
        if (onDone) onDone();
      }
    } catch (err) {
      setResult(`❌ Network error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  async function schedulePost() {
    if (!editedParts.length || !scheduledAt) {
      setResult("❌ Pilih tanggal jadwal");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/publish/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editedParts[0],
          imageUrl: imageUrl || undefined,
          parts: editedParts.length > 1 ? editedParts : undefined,
          scheduledAt: new Date(scheduledAt).toISOString()
        })
      });
      const data = await res.json();

      if (data.error) {
        setResult(`❌ Error: ${data.error}`);
      } else if (data.success) {
        setResult(`✅ Berhasil dijadwalkan untuk ${new Date(scheduledAt).toLocaleString()}`);
        setHtmlInput("");
        setParts([]);
        setEditedParts([]);
        setScheduledAt("");
        setShowSplit(false);
        if (onDone) onDone();
      }
    } catch (err) {
      setResult(`❌ Network error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2>Compose Utas dari HTML</h2>

      <div style={{ border: "1px solid #ddd", borderRadius: 4, background: "#f9f9f9" }}>
        <details>
          <summary style={{ cursor: "pointer", padding: 10, fontWeight: 600 }}>🧠 Template Prompt AI</summary>
          <pre style={{ margin: 0, padding: "0 10px 10px", whiteSpace: "pre-wrap", fontSize: "0.9em" }}>{promptTemplate}</pre>
        </details>
      </div>

      <div>
        <label>HTML dari LLM (Perplexity, ChatGPT, dsb):</label>
        <textarea
          value={htmlInput}
          onChange={(e) => setHtmlInput(e.target.value)}
          rows={6}
          placeholder="Paste HTML hasil generate dari LLM..."
          disabled={loading}
          style={{ width: "100%", fontFamily: "monospace", padding: 8, marginTop: 4 }}
        />
      </div>

      <button onClick={handlePreviewSplit} disabled={loading || !htmlInput.trim()}>
        {loading ? "⏳ Memproses..." : "👁️ Preview Split"}
      </button>

      {showSplit && (
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 4 }}>
          <h3>Edit Bagian Utas ({editedParts.length} parts)</h3>
          {editedParts.map((part, idx) => (
            <div key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #eee" }}>
              <label>Part {idx + 1}:</label>
              <textarea
                value={part}
                onChange={(e) => {
                  const newParts = [...editedParts];
                  newParts[idx] = e.target.value;
                  setEditedParts(newParts);
                }}
                rows={3}
                style={{ width: "100%", marginTop: 4, padding: 8 }}
              />
              <small>{part.length}/500 chars</small>
            </div>
          ))}
        </div>
      )}

      {editedParts.length > 0 && (
        <div>
          <label>URL Gambar (opsional, untuk part pertama):</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            disabled={loading}
          />
        </div>
      )}

      {editedParts.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={publishNow} disabled={loading}>
            {loading ? "⏳ Publishing..." : "🚀 Publish Now"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={loading}
            />
            <button onClick={schedulePost} disabled={loading || !scheduledAt}>
              {loading ? "⏳ Scheduling..." : "📅 Schedule"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, overflowX: "auto" }}>
          {result}
        </pre>
      )}
    </div>
  );
}
