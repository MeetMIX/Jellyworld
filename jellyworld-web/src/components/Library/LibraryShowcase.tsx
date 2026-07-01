'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";

interface ShowcaseItem { Id: string; Name: string; imageUrl: string; }
interface ContinueItem {
  Id: string; Name: string; Type: string;
  ProductionYear?: number; RunTimeTicks?: number;
  PlaybackPositionTicks: number; PlayedPercentage: number;
  posterUrl: string; backdropUrl: string;
}

const STORAGE_KEY = "jw_show_library_thumbs";

function formatRemaining(totalTicks?: number, playedTicks?: number): string {
  if (!totalTicks || !playedTicks) return "";
  const remainSec = Math.floor((totalTicks - playedTicks) / 10000000);
  if (remainSec <= 0) return "";
  const h = Math.floor(remainSec / 3600);
  const m = Math.floor((remainSec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min restantes` : `${m}min restantes`;
}

// Grille de vignettes 16/9e : une tuile "Continuer à regarder" (si du contenu
// est en cours) suivie d'une par bibliothèque. Remplace l'ancien bandeau
// "Continuer à regarder" en ligne. Se masque elle-même si l'utilisateur a
// désactivé le réglage correspondant depuis la navbar — écoute l'évènement
// custom "jw:settings-changed" pour réagir en direct, sans recharger la page
// (le composant qui écrit le localStorage — NavBar — est ailleurs dans l'arbre).
export default function LibraryShowcase({ items, continueWatching }: {
  items: ShowcaseItem[];
  continueWatching: ContinueItem[];
}) {
  const [visible, setVisible] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [hiddenLibs, setHiddenLibs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const read = () => {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "0");
      try {
        const raw = localStorage.getItem("jw_hidden_libraries");
        setHiddenLibs(new Set(raw ? JSON.parse(raw) : []));
      } catch { setHiddenLibs(new Set()); }
    };
    read();
    window.addEventListener("jw:settings-changed", read);
    return () => window.removeEventListener("jw:settings-changed", read);
  }, []);

  // Ferme la popup avec Échap
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const visibleItems = items.filter(lib => !hiddenLibs.has(lib.Id));
  const hasContinueWatching = continueWatching.length > 0;
  if (!visible || (visibleItems.length === 0 && !hasContinueWatching)) return null;

  return (
    <section>
      <h2 style={{
        fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
        color: "var(--jw-text-2)", margin: "0 0 14px",
      }}>Bibliothèques</h2>
      {/* Grille centrée (flex-wrap) plutôt qu'un grid étiré bord à bord : avec
          une largeur de tuile fixe (~230px) et un conteneur à 4 colonnes, 8
          vignettes se répartissent en 2 lignes égales (4+4) et 10-12 en 3
          lignes, toujours centrées plutôt que collées à gauche. */}
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center",
        gap: 16, maxWidth: 1000, margin: "0 auto",
      }}>
        {hasContinueWatching && (
          <button
            onClick={() => setModalOpen(true)}
            className="jw-showcase-tile"
            style={{
              position: "relative", display: "block", aspectRatio: "16/9",
              flex: "1 1 200px", maxWidth: 260,
              borderRadius: "var(--jw-r-md)", overflow: "hidden",
              border: "1px solid var(--jw-border)",
              padding: 0, margin: 0, font: "inherit", textAlign: "left",
              cursor: "pointer", background: "none",
            }}
          >
            <SafeImage src={continueWatching[0].backdropUrl || continueWatching[0].posterUrl} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(7,6,11,0.9) 0%, rgba(7,6,11,0.3) 55%, rgba(7,6,11,0.1) 100%)",
            }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "rgba(255,255,255,0.16)", backdropFilter: "blur(6px)",
                border: "1.5px solid rgba(255,255,255,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 3,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              </div>
            </div>
            <span style={{
              position: "absolute", left: 12, right: 12, bottom: 10,
              fontSize: 16, fontWeight: 800, color: "#fff", textAlign: "center",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>Continuer à regarder</span>
          </button>
        )}

        {visibleItems.map(lib => (
          <Link key={lib.Id} href={`/${lib.Id}`} className="jw-showcase-tile" style={{
            position: "relative", display: "block", aspectRatio: "16/9",
            flex: "1 1 200px", maxWidth: 260,
            borderRadius: "var(--jw-r-md)", overflow: "hidden",
            border: "1px solid var(--jw-border)",
            textDecoration: "none",
          }}>
            <SafeImage src={lib.imageUrl} alt={lib.Name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(7,6,11,0.88) 0%, rgba(7,6,11,0.15) 55%, transparent 100%)",
            }} />
            <span style={{
              position: "absolute", left: 12, right: 12, bottom: 10,
              fontSize: 16, fontWeight: 800, color: "#fff", textAlign: "center",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{lib.Name}</span>
          </Link>
        ))}
      </div>

      {/* Popup "Continuer à regarder" */}
      {modalOpen && (
        <>
          <div onClick={() => setModalOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(5,4,8,0.75)", backdropFilter: "blur(4px)",
          }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 201,
            width: "min(760px, 92vw)", maxHeight: "80vh", overflowY: "auto",
            background: "rgba(18,15,26,0.98)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, color: "#fff" }}>
                Continuer à regarder
              </h2>
              <button onClick={() => setModalOpen(false)} aria-label="Fermer" style={{
                background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
                width: 32, height: 32, color: "#fff", cursor: "pointer", fontSize: 16,
              }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 16 }}>
              {continueWatching.map(item => {
                const remaining = formatRemaining(item.RunTimeTicks, item.PlaybackPositionTicks);
                const pct = Math.min(100, Math.max(0, item.PlayedPercentage));
                return (
                  <Link key={item.Id} href={`/item/${item.Id}`} onClick={() => setModalOpen(false)}
                    style={{ display: "block", textDecoration: "none" }}>
                    <div style={{
                      position: "relative", aspectRatio: "2/3",
                      borderRadius: "var(--jw-r-card)", overflow: "hidden",
                      background: "var(--jw-card)", border: "1px solid var(--jw-border-subtle)",
                    }}>
                      <SafeImage src={item.posterUrl} alt={item.Name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.15)" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--jw-gradient)" }} />
                      </div>
                    </div>
                    <p style={{
                      fontSize: 11, fontWeight: 600, margin: "7px 0 0", lineHeight: 1.4,
                      color: "var(--jw-text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{item.Name}</p>
                    {remaining && (
                      <p style={{ fontSize: 10, color: "var(--jw-text-3)", margin: "2px 0 0" }}>{remaining}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`
        .jw-showcase-tile {
          transition: transform 0.28s cubic-bezier(.2,.8,.2,1), border-color 0.28s ease;
        }
        .jw-showcase-tile:hover {
          transform: scale(1.035);
          border-color: rgba(255,255,255,0.22);
          z-index: 2;
        }
      `}</style>
    </section>
  );
}
