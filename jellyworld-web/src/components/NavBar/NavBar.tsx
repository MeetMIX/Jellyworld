'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { JellyfinLibrary } from "@/lib/jellyfin";

interface JellyfinSession { userId: string; token: string; username: string; }

export default function NavBar({ libraries, session }: {
  libraries: JellyfinLibrary[];
  session?: JellyfinSession | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: "var(--jw-nav-height)",
      display: "flex", alignItems: "center", gap: 40,
      padding: "0 var(--jw-page-px)",
      background: "rgba(7,6,11,0.92)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--jw-border-subtle)",
    }}>

      {/* ── LOGO imposant ── */}
      <Link href="/" style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        lineHeight: 0,
        marginRight: 8,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="JellyWorld"
          className="jw-logo"
          style={{
            height: "var(--jw-logo-height)",
            width: "auto",
            minHeight: "var(--jw-logo-height)",
            maxHeight: "var(--jw-logo-height)",
            objectFit: "contain",
            display: "block",
            flexShrink: 0,
          }}
        />
      </Link>

      {/* ── Séparateur vertical ── */}
      <div style={{ width: 1, height: 32, background: "var(--jw-border)", flexShrink: 0 }} />

      {/* ── Nav links ── */}
      <nav style={{
        display: "flex", alignItems: "center", gap: 28,
        flex: 1, overflowX: "auto", scrollbarWidth: "none",
      }}>
        {libraries.map(lib => (
          <Link key={lib.Id} href={`/${lib.Id}`} style={{
            fontSize: 13, fontWeight: pathname === `/${lib.Id}` ? 700 : 500,
            whiteSpace: "nowrap",
            color: pathname === `/${lib.Id}` ? "#fff" : "rgba(255,255,255,0.50)",
            textDecoration: "none", transition: "color 0.2s", letterSpacing: "0.01em",
          }}>{lib.Name}</Link>
        ))}
      </nav>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <button style={{
          width: 38, height: 38, borderRadius: 10, padding: 0,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.6)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {session ? (
          <button onClick={logout} title={`${session.username} — Déconnexion`}
            style={{
              height: 38, borderRadius: 10, flexShrink: 0,
              background: "var(--jw-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "0 14px",
              fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer", border: "none", whiteSpace: "nowrap",
            }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
            }}>
              {session.username.charAt(0).toUpperCase()}
            </span>
            {session.username}
          </button>
        ) : (
          <Link href="/login" style={{
            height: 38, borderRadius: 10, flexShrink: 0,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 14px", fontSize: 13, color: "var(--jw-text-1)",
          }}>
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
