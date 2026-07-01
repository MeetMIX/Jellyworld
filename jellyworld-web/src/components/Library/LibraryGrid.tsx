'use client';

import { useState } from "react";
import Link from "next/link";
import MergeToolbar from "./MergeToolbar";
import SafeImage from "@/components/SafeImage";

interface GridItem {
  Id: string; Name: string; Type: string;
  ProductionYear?: number; CommunityRating?: number;
  UserData?: { Played?: boolean };
  posterUrl: string;
}

export default function LibraryGrid({ items, libraryId }: { items: GridItem[]; libraryId: string }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string, name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setSelectionMode(false);
  }

  const selectedItems = items.filter(i => selected.has(i.Id));

  return (
    <div>
      {/* Bouton mode sélection */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => { setSelectionMode(!selectionMode); setSelected(new Set()); }}
          style={{
            padding: "7px 16px", borderRadius: 8, cursor: "pointer",
            fontSize: 12, fontWeight: 600,
            background: selectionMode ? "rgba(139,63,200,0.2)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${selectionMode ? "rgba(139,63,200,0.4)" : "rgba(255,255,255,0.08)"}`,
            color: selectionMode ? "#A06EF0" : "rgba(255,255,255,0.55)",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {selectionMode
              ? <><path d="M20 6L9 17l-5-5"/></>
              : <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></>
            }
          </svg>
          {selectionMode ? `Mode sélection (${selected.size})` : "Sélectionner pour grouper"}
        </button>
      </div>

      {/* Toolbar de merge */}
      <MergeToolbar
        selectedIds={Array.from(selected)}
        selectedNames={selectedItems.map(i => i.Name)}
        libraryId={libraryId}
        onClear={clearSelection}
      />

      {/* Grille */}
      {items.length === 0 ? (
        <p style={{ color: "var(--jw-text-3)", fontSize: 14, paddingTop: 40 }}>Aucun média trouvé.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>
          {items.map(item => {
            const isSelected = selected.has(item.Id);

            return (
              <div
                key={item.Id}
                style={{ position: "relative" }}
                onClick={() => selectionMode && toggleSelect(item.Id, item.Name)}
              >
                {/* Checkbox overlay en mode sélection */}
                {selectionMode && (
                  <div style={{
                    position: "absolute", top: 8, left: 8, zIndex: 10,
                    width: 22, height: 22, borderRadius: 6,
                    background: isSelected ? "linear-gradient(110deg, #6B2FD9, #E03050)" : "rgba(0,0,0,0.6)",
                    border: `2px solid ${isSelected ? "transparent" : "rgba(255,255,255,0.4)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                )}

                {/* Card */}
                <div style={{
                  borderRadius: 12, overflow: "hidden",
                  border: `1px solid ${isSelected ? "rgba(139,63,200,0.6)" : "rgba(255,255,255,0.05)"}`,
                  background: "var(--jw-card)",
                  outline: isSelected ? "2px solid rgba(139,63,200,0.4)" : "none",
                  outlineOffset: 2,
                  transition: "all 0.15s",
                  cursor: selectionMode ? "pointer" : "default",
                  transform: isSelected ? "scale(0.97)" : "scale(1)",
                }}>
                  {selectionMode ? (
                    <div style={{ aspectRatio: "2/3" }}>
                      <SafeImage src={item.posterUrl} alt={item.Name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  ) : (
                    <Link href={`/item/${item.Id}`} style={{ display: "block" }}>
                      <div style={{ aspectRatio: "2/3", position: "relative" }}>
                        <SafeImage src={item.posterUrl} alt={item.Name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        {item.UserData?.Played && (
                          <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                          </div>
                        )}
                        {item.CommunityRating && (
                          <div style={{ position: "absolute", bottom: 6, left: 6, fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "1px 5px" }}>
                            ★ {item.CommunityRating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </Link>
                  )}
                </div>

                {/* Titre */}
                <div style={{ padding: "6px 2px 0" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, margin: 0, color: "var(--jw-text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.Name}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: "2px 0 0" }}>
                    {item.ProductionYear}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
