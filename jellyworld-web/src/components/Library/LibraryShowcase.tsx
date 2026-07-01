'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

interface ShowcaseItem { Id: string; Name: string; imageUrl: string; }

const STORAGE_KEY = "jw_show_library_thumbs";

// Grille de vignettes 16/9e, une par bibliothèque, en remplacement de
// l'ancien bandeau "Continuer à regarder". Se masque elle-même si
// l'utilisateur a désactivé le réglage correspondant depuis la navbar —
// écoute l'évènement custom "jw:settings-changed" pour réagir en direct,
// sans recharger la page (le composant qui écrit le localStorage — NavBar —
// est ailleurs dans l'arbre React).
export default function LibraryShowcase({ items }: { items: ShowcaseItem[] }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const read = () => setVisible(localStorage.getItem(STORAGE_KEY) !== "0");
    read();
    window.addEventListener("jw:settings-changed", read);
    return () => window.removeEventListener("jw:settings-changed", read);
  }, []);

  if (!visible || items.length === 0) return null;

  return (
    <section>
      <h2 style={{
        fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
        color: "var(--jw-text-2)", margin: "0 0 14px",
      }}>Bibliothèques</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 16,
      }}>
        {items.map(lib => (
          <Link key={lib.Id} href={`/${lib.Id}`} className="jw-showcase-tile" style={{
            position: "relative", display: "block", aspectRatio: "16/9",
            borderRadius: "var(--jw-r-md)", overflow: "hidden",
            border: "1px solid var(--jw-border)",
            textDecoration: "none",
          }}>
            <img src={lib.imageUrl} alt={lib.Name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(7,6,11,0.88) 0%, rgba(7,6,11,0.15) 55%, transparent 100%)",
            }} />
            <span style={{
              position: "absolute", left: 12, right: 12, bottom: 10,
              fontSize: 13, fontWeight: 700, color: "#fff",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{lib.Name}</span>
          </Link>
        ))}
      </div>

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
