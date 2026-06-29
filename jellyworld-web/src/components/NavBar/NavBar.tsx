'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { JellyfinLibrary } from "@/lib/jellyfin";

interface Session { userId: string; token: string; username: string; }

export default function NavBar({ libraries, session }: { libraries: JellyfinLibrary[]; session?: Session | null; }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      height: "var(--jw-nav-height)",
      display: "flex", alignItems: "center", gap: 28,
      padding: "0 var(--jw-page-px)",
      background: "rgba(7,6,11,0.95)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--jw-border-subtle)",
    }}>

      {/* ══ LOGO — approche triple-protection ══ */}
      <Link href="/" style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        lineHeight: 0,
        /* Réserve l'espace même avant le chargement de l'image */
        minWidth: "var(--jw-logo-max-width)",
        height: "var(--jw-nav-height)",
      }}>
        {/*
          Pas de composant Next/Image ici — on utilise <img> natif
          avec className ET style inline pour une priorité maximale.
          Le CSS dans globals.css ajoute une troisième couche de protection.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="JellyWorld"
          className="jw-logo-img"
          style={{
            /* Style inline = priorité la plus haute possible en CSS */
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
      </Link>

      {/* Séparateur */}
      {!searchOpen && (
        <div style={{ width: 1, height: 32, background: "var(--jw-border)", flexShrink: 0 }} />
      )}

      {/* Nav links */}
      {!searchOpen && (
        <nav className="scrollbar-none" style={{
          display: "flex", alignItems: "center", gap: 24,
          flex: 1, overflowX: "auto",
        }}>
          {libraries.map(lib => (
            <Link key={lib.Id} href={`/${lib.Id}`} style={{
              fontSize: 13, fontWeight: pathname === `/${lib.Id}` ? 700 : 500,
              whiteSpace: "nowrap",
              color: pathname === `/${lib.Id}` ? "#fff" : "rgba(255,255,255,0.50)",
              textDecoration: "none", transition: "color 0.2s",
            }}>{lib.Name}</Link>
          ))}
        </nav>
      )}

      {/* Barre de recherche inline */}
      {searchOpen && (
        <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--jw-text-3)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher…"
              style={{
                width: "100%", padding: "9px 12px 9px 38px",
                background: "var(--jw-card)", border: "1px solid var(--jw-border-strong)",
                borderRadius: "var(--jw-r-md)", fontSize: 14,
                color: "var(--jw-text-1)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <button type="button" onClick={() => { setSearchOpen(false); setQuery(""); }}
            style={{ background: "none", border: "none", color: "var(--jw-text-2)", cursor: "pointer", fontSize: 13, padding: "6px 8px" }}>
            Annuler
          </button>
        </form>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{
          width: 38, height: 38, borderRadius: 10, padding: 0,
          background: searchOpen ? "rgba(107,47,217,0.2)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${searchOpen ? "rgba(107,47,217,0.5)" : "rgba(255,255,255,0.10)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: searchOpen ? "#A06EF0" : "rgba(255,255,255,0.6)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {session ? (
          <button onClick={logout} title={`${session.username} — Déconnexion`} style={{
            height: 38, borderRadius: 10, flexShrink: 0,
            background: "var(--jw-gradient)", border: "none",
            display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
            fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
          }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
              {session.username.charAt(0).toUpperCase()}
            </span>
            {session.username}
          </button>
        ) : (
          <Link href="/login" style={{ height: 38, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: "var(--jw-text-1)" }}>
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
