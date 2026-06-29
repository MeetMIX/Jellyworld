'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JellyfinLibrary } from "@/lib/jellyfin";

export default function NavBar({ libraries }: { libraries: JellyfinLibrary[] }) {
  const pathname = usePathname();

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: "72px",
      display: "flex", alignItems: "center", gap: 32,
      padding: "0 48px",
      background: "rgba(7, 6, 11, 0.88)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>

      {/* ── Logo : toutes les propriétés en inline style, rien en classe CSS ── */}
      <Link href="/"
        style={{ flexShrink: 0, display: "flex", alignItems: "center", textDecoration: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="JellyWorld"
          style={{
            display: "block",
            height: "56px",
            width: "auto",
            maxWidth: "220px",
            objectFit: "contain",
            imageRendering: "auto",
            /* anti-Tailwind reset */
            minHeight: "56px",
            maxHeight: "56px",
            flexShrink: 0,
          }}
        />
      </Link>

      {/* ── Nav links ── */}
      <nav style={{
        display: "flex", alignItems: "center", gap: 24,
        flex: 1, overflowX: "auto",
        msOverflowStyle: "none", scrollbarWidth: "none",
      }}>
        {libraries.map((lib) => {
          const isActive = pathname === `/${lib.Id}` || pathname === "/";
          return (
            <Link
              key={lib.Id}
              href={`/${lib.Id}`}
              style={{
                fontSize: "13px",
                fontWeight: pathname === `/${lib.Id}` ? 700 : 500,
                whiteSpace: "nowrap",
                color: pathname === `/${lib.Id}` ? "#ffffff" : "rgba(255,255,255,0.50)",
                textDecoration: "none",
                letterSpacing: "0.01em",
                transition: "color 0.2s",
              }}
            >
              {lib.Name}
            </Link>
          );
        })}
      </nav>

      {/* ── Actions ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button style={{
          width: "36px", height: "36px", borderRadius: "8px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.6)",
          padding: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: "linear-gradient(110deg, #6B2FD9 0%, #B83FA0 50%, #E03050 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer",
          flexShrink: 0,
        }}>A</div>
      </div>
    </header>
  );
}
