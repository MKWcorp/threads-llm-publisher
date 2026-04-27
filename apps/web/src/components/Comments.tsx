import { useEffect, useState } from "react";

interface Comment {
  id: string;
  text: string;
  username?: string;
  replyText?: string;
  repliedAt?: string;
}

interface CommentsProps {
  apiBaseUrl: string;
}

export function Comments({ apiBaseUrl }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    loadComments();
    const interval = setInterval(loadComments, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function loadComments() {
    try {
      const res = await fetch(`${apiBaseUrl}/comments`);
      const data = await res.json();
      if (data.comments) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(commentId: string) {
    if (!replyText.trim()) {
      setResult("❌ Reply tidak boleh kosong");
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/comments/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyToId: commentId, text: replyText })
      });
      const data = await res.json();

      if (data.error) {
        setResult(`❌ Error: ${data.error}`);
      } else if (data.success) {
        setResult("✅ Reply terkirim!");
        setReplyText("");
        setReplyingTo(null);
        loadComments();
      }
    } catch (err) {
      setResult(`❌ Network error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  if (loading) return <p>⏳ Loading comments...</p>;

  return (
    <div>
      <h2>Komentar & Mentions</h2>
      {comments.length === 0 ? (
        <p>Tidak ada komentar baru.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {comments.map((comment) => (
            <div key={comment.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 4 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: "bold", color: "#1f2937" }}>
                  {comment.username ? `@${comment.username}` : "Anonymous"}
                </span>
              </div>
              <p style={{ marginTop: 8, marginBottom: 12 }}>{comment.text}</p>

              {comment.repliedAt && comment.replyText ? (
                <div style={{ background: "#f0f0f0", padding: 8, borderRadius: 4, marginBottom: 12, fontSize: "0.9em" }}>
                  <span style={{ fontWeight: "bold" }}>✅ Your reply:</span>
                  <p style={{ margin: "4px 0 0 0" }}>{comment.replyText}</p>
                </div>
              ) : (
                <>
                  {replyingTo === comment.id ? (
                    <div style={{ marginTop: 8 }}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Tulis balasan..."
                        rows={3}
                        style={{ width: "100%", padding: 8, marginBottom: 8 }}
                        maxLength={500}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => sendReply(comment.id)}>
                          📤 Send Reply
                        </button>
                        <button onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                          ✖️ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReplyingTo(comment.id)} style={{ padding: "4px 8px" }}>
                      💬 Reply
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {result && (
        <pre style={{ marginTop: 12, background: "#f5f5f5", padding: 8, borderRadius: 4 }}>{result}</pre>
      )}
    </div>
  );
}
