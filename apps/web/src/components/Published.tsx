import { useEffect, useState } from "react";

interface Post {
  id: string;
  text: string;
  parts?: string[];
  threadsPostId?: string;
  createdAt?: string;
}

interface PublishedProps {
  apiBaseUrl: string;
}

export function Published({ apiBaseUrl }: PublishedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const res = await fetch(`${apiBaseUrl}/publish/posts`);
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts.reverse());
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>⏳ Loading...</p>;

  return (
    <div>
      <h2>Post Terpublikasi</h2>
      {posts.length === 0 ? (
        <p>Belum ada post yang dipublikasikan.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((post) => (
            <div key={post.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 4, background: "#f9f9f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: "bold", color: "#0a7e1e" }}>✅ Published</span>
                {post.createdAt && (
                  <span style={{ fontSize: "0.9em", color: "#666" }}>
                    {new Date(post.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
              {post.parts && post.parts.length > 1 ? (
                <div>
                  <p style={{ marginTop: 8, fontSize: "0.9em", fontStyle: "italic" }}>Utas {post.parts.length} bagian:</p>
                  {post.parts.map((part, idx) => (
                    <div key={idx} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dotted #ddd" }}>
                      <small style={{ color: "#666" }}>Part {idx + 1}:</small>
                      <p style={{ margin: "4px 0 0 0" }}>{part}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: 8 }}>{post.text}</p>
              )}
              {post.threadsPostId && (
                <a
                  href={`https://threads.net/thread/${post.threadsPostId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: 8, color: "#1f2937", textDecoration: "underline" }}
                >
                  → Lihat di Threads
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
