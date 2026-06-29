'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MergeToolbarProps {
  selectedIds: string[];
  selectedNames: string[];
  libraryId: string;
  onClear: () => void;
}

export default function MergeToolbar({ selectedIds, selectedNames, libraryId, onClear }: MergeToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  if (selectedIds.length < 2) return null;

  async function mergeItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/merge-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedIds }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        setTimeout(() => {
          onClear();
          router.refresh();
        }, 1500);
      } else {
        alert(`Erreur : ${data.error ?? "groupement impossible"}`);
      }
    } catch (e) {
      alert("Erreur réseau");
    }
    setLoading(false);
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 40,
      background: done ? "rgba(34,197,94,0.15)" : "rgba(107,47,217,0.15)",
      border: `1px solid ${done ? "rgba(34,197,94,0.4)" : "rgba(107,47,217,0.4)"}`,
      borderRadius: 12, padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 16,
      marginBottom: 16,
      backdropFilter: "blur(8px)",
    }}>
      {/* Pastilles médias sélectionnés */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: done ? "#4ade80" : "#A06EF0", whiteSpace: "nowrap" }}>
          {done ? "✓ Groupés !" : `${selectedIds.length} médias sélectionnés`}
        </span>
        {!done && selectedNames.slice(0, 3).map((name, i) => (
          <span key={i} style={{
            fontSize: 11, padding: "2px 10px", borderRadius: 20,
            background: "rgba(139,63,200,0.2)", border: "1px solid rgba(139,63,200,0.3)",
            color: "var(--jw-text-1)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{name}</span>
        ))}
        {!done && selectedNames.length > 3 && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>+{selectedNames.length - 3} autres</span>
        )}
      </div>

      {!done && (
        <>
          <button onClick={onClear} style={{
            padding: "7px 16px", borderRadius: 8,
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer",
          }}>
            Annuler
          </button>
          <button onClick={mergeItems} disabled={loading} style={{
            padding: "7px 20px", borderRadius: 8,
            background: "linear-gradient(110deg, #6B2FD9, #E03050)",
            border: "none", fontSize: 12, fontWeight: 700,
            color: "#fff", cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 7,
            opacity: loading ? 0.7 : 1,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 6h8M8 12h8M8 18h8M3 6h.01M3 12h.01M3 18h.01"/>
            </svg>
            {loading ? "Groupement…" : "Grouper ces médias"}
          </button>
        </>
      )}
    </div>
  );
}
