'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { JellyfinLibrary } from "@/lib/jellyfin";

interface Session { userId: string; token: string; username: string; }

// Composant logo isolé — force les styles après hydration React
function JellyWorldLogo() {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Force appliqué après que React et Tailwind ont fini leur travail
    if (!imgRef.current) return;
    const el = imgRef.current;
    el.style.setProperty("height", "268px", "important");
    el.style.setProperty("width", "auto", "important");
    el.style.setProperty("min-height", "268px", "important");
    el.style.setProperty("max-height", "268px", "important");
    el.style.setProperty("max-width", "680px", "important");
    el.style.setProperty("object-fit", "contain", "important");
    el.style.setProperty("display", "block", "important");
    el.style.setProperty("flex-shrink", "0", "important");
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src="/logo.png"
      alt="JellyWorld"
      // Attribut HTML width/height = hint navigateur avant CSS
      width={280}
      height={68}
      style={{
        height: "68px",
        width: "auto",
        minHeight: "68px",
        maxHeight: "68px",
        maxWidth: "280px",
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}

export default function NavBar({ libraries, session }: {
  libraries: JellyfinLibrary[];
  session?: Session | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { if (searchOpen) inputRef.current?.focus(); }, [searchOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false); setQuery("");
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login"); router.refresh();
  }

  return (
    <>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "88px",
        display: "flex", alignItems: "center",
        padding: "0 32px",
        gap: 20,
        background: "rgba(7,6,11,0.96)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>

        {/* ══ LOGO — div parent sans contrainte de hauteur ══ */}
        <Link href="/" style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          textDecoration: "none",
          // Pas de height ici pour ne pas contraindre l'image
        }}>
          <JellyWorldLogo />
        </Link>

        {/* Séparateur */}
        {!searchOpen && (
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
        )}

        {/* Nav desktop */}
        {!searchOpen && (
          <nav style={{
            display: "flex", alignItems: "center", gap: 20,
            flex: 1, overflow: "hidden", // pas de scroll, on tronque
          }}>
            {libraries.map(lib => (
              <Link key={lib.Id} href={`/${lib.Id}`} style={{
                fontSize: 13, fontWeight: pathname === `/${lib.Id}` ? 700 : 500,
                whiteSpace: "nowrap",
                color: pathname === `/${lib.Id}` ? "#fff" : "rgba(255,255,255,0.50)",
                textDecoration: "none", transition: "color 0.2s",
                overflow: "hidden", textOverflow: "ellipsis",
                flexShrink: 1,
              }}>{lib.Name}</Link>
            ))}
          </nav>
        )}

        {/* Recherche inline */}
        {searchOpen && (
          <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un film, une série…"
                style={{
                  width: "100%", padding: "10px 14px 10px 40px",
                  background: "var(--jw-card)", border: "1px solid var(--jw-border-strong)",
                  borderRadius: "var(--jw-r-md)", fontSize: 15,
                  color: "var(--jw-text-1)", outline: "none", boxSizing: "border-box",
                }}
              />
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4, pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <button type="button" onClick={() => { setSearchOpen(false); setQuery(""); }}
              style={{ background: "none", border: "none", color: "var(--jw-text-2)", cursor: "pointer", fontSize: 13, padding: "6px 4px", whiteSpace: "nowrap" }}>
              Annuler
            </button>
          </form>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <button onClick={() => setSearchOpen(!searchOpen)} style={{
            width: 38, height: 38, borderRadius: 10, padding: 0,
            background: searchOpen ? "rgba(107,47,217,0.2)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${searchOpen ? "rgba(107,47,217,0.4)" : "rgba(255,255,255,0.10)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.6)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>

          {/* Hamburger menu pour les bibliothèques sur petits écrans */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            width: 38, height: 38, borderRadius: 10, padding: 0,
            background: menuOpen ? "rgba(107,47,217,0.2)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            display: "none", // caché sur desktop, visible via @media dans globals
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.6)",
          }} className="jw-hamburger">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          {session ? (
            <button onClick={logout} title={`${session.username} — Déconnexion`} style={{
              height: 38, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(110deg, #6B2FD9 0%, #B83FA0 50%, #E03050 100%)",
              border: "none",
              display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
              fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                {session.username.charAt(0).toUpperCase()}
              </span>
              <span className="jw-username">{session.username}</span>
            </button>
          ) : (
            <Link href="/login" style={{ height: 38, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: "#fff" }}>
              Connexion
            </Link>
          )}
        </div>
      </header>

      {/* Menu mobile déroulant */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 88, left: 0, right: 0, zIndex: 99,
          background: "rgba(7,6,11,0.98)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "12px 32px 16px",
          display: "flex", flexDirection: "column", gap: 0,
        }}>
          {libraries.map(lib => (
            <Link key={lib.Id} href={`/${lib.Id}`}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "12px 0",
                fontSize: 14, fontWeight: pathname === `/${lib.Id}` ? 700 : 500,
                color: pathname === `/${lib.Id}` ? "#fff" : "rgba(255,255,255,0.6)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>{lib.Name}</Link>
          ))}
        </div>
      )}

      {/* Styles responsive */}
      <style>{`
        /* Nav desktop : affiche tous les liens */
        @media (min-width: 1200px) {
          .jw-hamburger { display: none !important; }
        }
        /* Nav compressée : cache certains liens, affiche hamburger */
        @media (max-width: 1199px) {
          .jw-hamburger { display: flex !important; }
        }
        /* Très petit écran : cache le nom utilisateur */
        @media (max-width: 640px) {
          .jw-username { display: none !important; }
        }
      `}</style>
    </>
  );
}
