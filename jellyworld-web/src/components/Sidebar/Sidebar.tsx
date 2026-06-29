'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { JellyfinLibrary } from "@/lib/jellyfin";

interface Session { userId: string; token: string; username: string; }

interface SidebarProps {
  libraries: JellyfinLibrary[];
  session?: Session | null;
}

// Icônes par type de bibliothèque
function LibIcon({ type }: { type?: string }) {
  const t = type ?? "";
  if (t === "movies") return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>;
  if (t === "tvshows") return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M17 2l-5 5-5-5"/></svg>;
  if (t === "music") return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
}

export default function Sidebar({ libraries, session }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  // Force logo size après hydration
  useEffect(() => {
    if (!logoRef.current) return;
    const el = logoRef.current;
    el.style.setProperty("height", "56px", "important");
    el.style.setProperty("width", "auto", "important");
    el.style.setProperty("max-width", "180px", "important");
    el.style.setProperty("object-fit", "contain", "important");
    el.style.setProperty("display", "block", "important");
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login"); router.refresh();
  }

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: sidebarWidth,
        background: "rgba(7,5,14,0.97)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        zIndex: 50,
        transition: "width 250ms ease",
        overflow: "hidden",
      }} className="jw-sidebar-desktop">

        {/* Logo + collapse */}
        <div style={{
          padding: collapsed ? "20px 16px" : "20px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          flexShrink: 0,
        }}>
          {!collapsed && (
            <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={logoRef}
                src="/logo.png"
                alt="JellyWorld"
                width={180}
                height={56}
                style={{
                  height: "56px", width: "auto",
                  maxWidth: "180px", objectFit: "contain", display: "block",
                }}
              />
            </Link>
          )}
          {collapsed && (
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" width={32} height={32}
                style={{ width: 32, height: 32, objectFit: "contain" }} />
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 4, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {collapsed
                ? <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
                : <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {/* Recherche */}
        {!collapsed && (
          <form onSubmit={handleSearch} style={{ padding: "12px 16px 8px", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.35, pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher…"
                style={{
                  width: "100%", padding: "8px 10px 8px 32px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, fontSize: 13, color: "#fff",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </form>
        )}

        {/* Nav bibliothèques */}
        <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px 8px" : "8px 8px", scrollbarWidth: "none" }}>
          {/* Accueil */}
          <SidebarLink href="/" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
          } label="Accueil" active={pathname === "/"} collapsed={collapsed} />

          {libraries.length > 0 && !collapsed && (
            <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em", padding: "12px 10px 4px", margin: 0 }}>
              Bibliothèques
            </p>
          )}

          {libraries.map(lib => (
            <SidebarLink
              key={lib.Id}
              href={`/${lib.Id}`}
              icon={<LibIcon type={lib.CollectionType} />}
              label={lib.Name}
              active={pathname === `/${lib.Id}` || pathname.startsWith(`/${lib.Id}?`)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Utilisateur en bas */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: collapsed ? "12px 8px" : "12px 12px",
          flexShrink: 0,
        }}>
          {session ? (
            <button onClick={logout} style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: collapsed ? 0 : 10, padding: "8px",
              background: "none", border: "none", cursor: "pointer",
              borderRadius: 8, justifyContent: collapsed ? "center" : "flex-start",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(110deg, #6B2FD9, #E03050)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: "#fff",
              }}>
                {session.username.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div style={{ textAlign: "left", overflow: "hidden" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {session.username}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>Déconnexion</p>
                </div>
              )}
            </button>
          ) : (
            <Link href="/login" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px",
              color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none",
              justifyContent: collapsed ? "center" : "flex-start",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {!collapsed && "Connexion"}
            </Link>
          )}
        </div>
      </aside>

      {/* ── Bouton hamburger mobile ── */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="jw-hamburger-btn"
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 200,
          width: 40, height: 40, borderRadius: 10,
          background: "rgba(7,5,14,0.9)", border: "1px solid rgba(255,255,255,0.1)",
          display: "none", alignItems: "center", justifyContent: "center",
          color: "#fff", cursor: "pointer",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* ── Drawer mobile ── */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 199 }}>
          <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 260,
            background: "rgba(7,5,14,0.99)", borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "20px 16px", display: "flex", flexDirection: "column", gap: 4,
            overflowY: "auto",
          }}>
            <Link href="/" onClick={() => setMobileOpen(false)} style={{ marginBottom: 16, display: "block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="JellyWorld" style={{ height: 48, width: "auto", objectFit: "contain" }} />
            </Link>
            {libraries.map(lib => (
              <Link key={lib.Id} href={`/${lib.Id}`} onClick={() => setMobileOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 8, color: pathname === `/${lib.Id}` ? "#fff" : "rgba(255,255,255,0.55)",
                fontWeight: pathname === `/${lib.Id}` ? 700 : 400, fontSize: 14,
                background: pathname === `/${lib.Id}` ? "rgba(139,63,200,0.2)" : "none",
              }}>
                <LibIcon type={lib.CollectionType} />
                {lib.Name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .jw-sidebar-desktop { display: none !important; }
          .jw-hamburger-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}

function SidebarLink({ href, icon, label, active, collapsed }: {
  href: string; icon: React.ReactNode; label: string; active: boolean; collapsed: boolean;
}) {
  return (
    <Link href={href} title={collapsed ? label : undefined} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: collapsed ? "10px" : "9px 10px",
      borderRadius: 8, marginBottom: 2,
      background: active ? "rgba(139,63,200,0.18)" : "none",
      color: active ? "#fff" : "rgba(255,255,255,0.5)",
      fontSize: 13, fontWeight: active ? 600 : 400,
      transition: "background 0.15s, color 0.15s",
      textDecoration: "none",
      justifyContent: collapsed ? "center" : "flex-start",
      whiteSpace: "nowrap", overflow: "hidden",
      borderLeft: active ? "2px solid #8B3FC8" : "2px solid transparent",
    }}>
      <span style={{ flexShrink: 0, color: active ? "#A06EF0" : "inherit" }}>{icon}</span>
      {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
    </Link>
  );
}
