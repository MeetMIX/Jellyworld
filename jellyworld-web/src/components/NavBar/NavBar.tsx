import Link from "next/link";
import { JellyfinLibrary } from "@/lib/jellyfin";

interface NavBarProps {
  libraries: JellyfinLibrary[];
}

export default function NavBar({ libraries }: NavBarProps) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "var(--jw-nav-height)",
        display: "flex",
        alignItems: "center",
        gap: 40,
        padding: "0 var(--jw-page-px)",
        background: "rgba(7, 6, 11, 0.82)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--jw-border-subtle)",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ flexShrink: 0 }}>
        <img
          src="/logo.png"
          alt="JellyWorld"
          style={{
            height: 52,
            width: "auto",
            maxWidth: 280,
            objectFit: "contain",
            display: "block",
            transition: "transform var(--jw-transition)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.transform = "scale(1.03)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.transform = "scale(1)")
          }
        />
      </Link>

      {/* Liens bibliothèques */}
      <nav
        className="scrollbar-none"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          overflowX: "auto",
          flex: 1,
        }}
      >
        {libraries.map((lib) => (
          <Link
            key={lib.Id}
            href={`/${lib.Id}`}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--jw-text-2)",
              whiteSpace: "nowrap",
              transition: "color var(--jw-transition)",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.color = "var(--jw-text-1)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.color = "var(--jw-text-2)")
            }
          >
            {lib.Name}
          </Link>
        ))}
      </nav>

      {/* Actions droite */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {/* Recherche */}
        <button
          aria-label="Rechercher"
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--jw-r-md)",
            background: "var(--jw-card)",
            border: "1px solid var(--jw-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--jw-text-2)",
            transition: "border-color var(--jw-transition), color var(--jw-transition)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--jw-border-strong)";
            (e.currentTarget as HTMLElement).style.color = "var(--jw-text-1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--jw-border)";
            (e.currentTarget as HTMLElement).style.color = "var(--jw-text-2)";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        {/* Avatar */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--jw-gradient)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          A
        </div>
      </div>
    </header>
  );
}
