'use client';

import { useState } from "react";

interface WatchedButtonProps {
  itemId: string;
  initialWatched: boolean;
}

export default function WatchedButton({ itemId, initialWatched }: WatchedButtonProps) {
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, watched: !watched }),
    });
    if (res.ok) setWatched(!watched);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={watched ? "Marquer non-vu" : "Marquer comme vu"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "12px 20px", borderRadius: "var(--jw-r-md)",
        background: watched ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)",
        border: `1px solid ${watched ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.12)"}`,
        fontSize: 13, fontWeight: 600,
        color: watched ? "#4ade80" : "var(--jw-text-2)",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {watched ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Vu
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4m0 4h.01"/>
          </svg>
          Marquer vu
        </>
      )}
    </button>
  );
}
