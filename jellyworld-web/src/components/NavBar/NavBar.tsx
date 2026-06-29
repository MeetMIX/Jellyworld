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
      {/* Logo */}
      <Link href="/" style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        <img
          src="/logo.png"
          alt="JellyWorld"
          style={{ height: "56px", width: "auto", display: "block", objectFit: "contain" }}
        />
      </Link>

      {/* Nav links */}
      <nav style={{
        display: "flex", alignItems: "center", gap: 24,
        flex: 1, overflowX: "auto",
        msOverflowStyle: "none", scrollbarWidth: "none",
      }}>
        {libraries.map((lib) => (
          <Link
            key={lib.Id}
            href={`/${lib.Id}`}
            style={{
              fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              color: pathname === `/${lib.Id}` ? "#ffffff" : "rgba(255,255,255,0.55)",
              transition: "color 0.2s",
              letterSpacing: "0.01em",
            }}
          >
            {lib.Name}
          </Link>
        ))}
      </nav>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button style={{
          width: 36, height: 36, borderRadius: 8,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.6)",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(110deg, #6B2FD9 0%, #B83FA0 50%, #E03050 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
        }}>A</div>
      </div>
    </header>
  );
}
