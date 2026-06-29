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
      height: "72px",
      display: "flex", alignItems: "center", gap: 32,
      padding: "0 48px",
      background: "rgba(7,6,11,0.90)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <Link href="/" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
        <img src="/logo.png" alt="JellyWorld" width={180} height={56}
          style={{ width: "auto", height: "56px", minHeight: "56px", maxHeight: "56px", objectFit: "contain", display: "block" }} />
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: 24, flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
        {libraries.map(lib => (
          <Link key={lib.Id} href={`/${lib.Id}`} style={{
            fontSize: "13px",
            fontWeight: pathname === `/${lib.Id}` ? 700 : 500,
            whiteSpace: "nowrap",
            color: pathname === `/${lib.Id}` ? "#fff" : "rgba(255,255,255,0.50)",
            textDecoration: "none", transition: "color 0.2s",
          }}>{lib.Name}</Link>
        ))}
      </nav>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <button style={{ width: 36, height: 36, borderRadius: 8, padding: 0, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
        {session ? (
          <button onClick={logout} title={`${session.username} — Déconnexion`} style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "var(--jw-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", border: "none" }}>
            {session.username.charAt(0).toUpperCase()}
          </button>
        ) : (
          <Link href="/login" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </Link>
        )}
      </div>
    </header>
  );
}
