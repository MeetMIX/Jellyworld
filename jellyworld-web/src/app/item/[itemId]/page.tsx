import Link from "next/link";
import { getFirstUserId, getUserLibraries, getItemById, formatRuntime } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const userId = await getFirstUserId();
  const [libraries, item] = await Promise.all([
    userId ? getUserLibraries(userId) : Promise.resolve([]),
    userId ? getItemById(itemId, userId) : Promise.resolve(null),
  ]);

  if (!item) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
        <NavBar libraries={libraries} />
        <main style={{ paddingTop: 112, paddingLeft: 48, paddingRight: 48 }}>
          <Link href="/" style={{ fontSize: 11, fontWeight: 700, color: "var(--jw-purple)", textTransform: "uppercase" }}>
            ← Accueil
          </Link>
          <p style={{ marginTop: 40, color: "var(--jw-text-3)" }}>Média introuvable.</p>
        </main>
      </div>
    );
  }

  const runtime = formatRuntime(item.RunTimeTicks);

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} />

      {/* Hero backdrop */}
      <section style={{ position: "relative", height: "70vh", minHeight: 400, overflow: "hidden" }}>
        <img
          src={item.backdropUrl}
          alt={item.Name}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.35)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--jw-bg) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--jw-bg) 0%, transparent 50%)" }} />
      </section>

      {/* Contenu — chevauchement sur le hero */}
      <main style={{
        position: "relative",
        marginTop: "-280px",
        zIndex: 10,
        paddingLeft: 48, paddingRight: 48, paddingBottom: 80,
        paddingTop: 0,
        display: "flex",
        gap: 40,
        alignItems: "flex-start",
      }}>
        {/* Poster */}
        <div style={{
          flexShrink: 0, width: 200,
          borderRadius: "var(--jw-r-lg)",
          overflow: "hidden",
          border: "1px solid var(--jw-border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
          marginTop: 40,
        }}>
          <img
            src={item.posterUrl}
            alt={item.Name}
            style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }}
          />
        </div>

        {/* Infos */}
        <div style={{ flex: 1, paddingTop: 80, maxWidth: 680 }}>
          <Link href="/" style={{
            fontSize: 11, fontWeight: 700, color: "var(--jw-purple)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            display: "inline-block", marginBottom: 24,
          }}>← Accueil</Link>

          <h1 style={{
            fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900,
            letterSpacing: "-0.02em", lineHeight: 1.1,
            color: "#fff", margin: "0 0 12px",
            textTransform: "uppercase",
          }}>{item.Name}</h1>

          {/* Meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {item.ProductionYear && (
              <span style={{ fontSize: 13, color: "var(--jw-text-2)" }}>{item.ProductionYear}</span>
            )}
            {runtime && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--jw-text-3)", display: "inline-block" }} />
                <span style={{ fontSize: 13, color: "var(--jw-text-2)" }}>{runtime}</span>
              </>
            )}
            {item.CommunityRating && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--jw-text-3)", display: "inline-block" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#A06EF0" }}>★ {item.CommunityRating.toFixed(1)}</span>
              </>
            )}
            {item.Genres?.slice(0, 3).map((g) => (
              <span key={g} style={{
                fontSize: 11, fontWeight: 600, color: "var(--jw-purple)",
                background: "rgba(107,47,217,0.15)",
                border: "1px solid rgba(107,47,217,0.3)",
                borderRadius: "var(--jw-r-sm)", padding: "3px 10px",
              }}>{g}</span>
            ))}
          </div>

          {/* Overview */}
          {item.Overview && (
            <p style={{
              fontSize: 14, color: "var(--jw-text-2)", lineHeight: 1.75,
              margin: "0 0 28px", maxWidth: 560,
            }}>{item.Overview}</p>
          )}

          {/* Bouton Regarder */}
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 32px", borderRadius: "var(--jw-r-md)",
              background: "var(--jw-gradient)", border: "none",
              fontSize: 14, fontWeight: 700, color: "#fff",
              cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Regarder
            </button>
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 24px", borderRadius: "var(--jw-r-md)",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 14, fontWeight: 600, color: "var(--jw-text-1)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>← Retour</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
