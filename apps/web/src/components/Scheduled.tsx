import { useEffect, useState } from "react";

interface Job {
  id: string;
  text: string;
  scheduledAt?: string;
  status: string;
  error?: string;
}

interface ScheduledProps {
  apiBaseUrl: string;
}

export function Scheduled({ apiBaseUrl }: ScheduledProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState("");

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  async function loadJobs() {
    try {
      const res = await fetch(`${apiBaseUrl}/publish/jobs`);
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs.filter((j: Job) => j.status !== "published"));
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function cancelJob(id: string) {
    try {
      const res = await fetch(`${apiBaseUrl}/publish/jobs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setResult("✅ Job dibatalkan");
        loadJobs();
      } else {
        setResult(`❌ ${data.error}`);
      }
    } catch (err) {
      setResult(`❌ Network error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  async function retryJob(id: string) {
    try {
      const res = await fetch(`${apiBaseUrl}/publish/jobs/${id}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResult("✅ Job di-retry");
        loadJobs();
      } else {
        setResult(`❌ ${data.error}`);
      }
    } catch (err) {
      setResult(`❌ Network error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  if (loading) return <p>⏳ Loading...</p>;

  return (
    <div>
      <h2>Jadwal Posting</h2>
      {jobs.length === 0 ? (
        <p>Tidak ada posting terjadwal.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {jobs.map((job) => (
            <div key={job.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: "bold" }}>
                  {job.status === "pending" ? "⏳" : job.status === "processing" ? "🔄" : "❌"} {job.status}
                </span>
                {job.scheduledAt && (
                  <span>{new Date(job.scheduledAt).toLocaleString()}</span>
                )}
              </div>
              <p style={{ marginTop: 8, marginBottom: 8 }}>{job.text}</p>
              {job.error && <p style={{ color: "red", fontSize: "0.9em" }}>Error: {job.error}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {job.status === "pending" && (
                  <>
                    <button onClick={() => cancelJob(job.id)} style={{ padding: "4px 8px" }}>
                      ❌ Cancel
                    </button>
                    <button onClick={() => retryJob(job.id)} style={{ padding: "4px 8px" }}>
                      🔄 Retry
                    </button>
                  </>
                )}
                {job.status === "failed" && (
                  <button onClick={() => retryJob(job.id)} style={{ padding: "4px 8px" }}>
                    🔄 Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {result && (
        <pre style={{ marginTop: 12, background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
          {result}
        </pre>
      )}
    </div>
  );
}
