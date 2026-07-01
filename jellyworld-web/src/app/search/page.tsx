import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserLibraries } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function searchItems(query: string, userId: string, token: string) {
  const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
  const PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
  const API_KEY = process.env.JELLYFIN_API_KEY || "";

  if (!query.trim()) return [];
  try {
    const url = `${INTERNAL}/Users/${userId}/Items`
      + `?SearchTerm=${encodeURIComponent(query)}`
      // Élargi : Movie/Series/MusicVideo excluait épisodes, albums, musique,
      // livres audio... "IncludeItemTypes" combiné à "Recursive" suffit à
      // couvrir toute la bibliothèque sans avoir besoin d'un type par média.
      + `&IncludeItemTypes=Movie,Series,Episode,MusicVideo,Audio,MusicAlbum,BoxSet,Video`
      + `&Recursive=true&Limit=40`
      + `&Fields=PrimaryImageAspectRatio,ImageTags,Overview,ProductionYear`;
    const res = await fetch(url, {
      headers: { Authorization: `MediaBrowser Token="${token}"` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[Search] Jellyfin a répondu ${res.status} pour "${query}"`);
      return [];
    }
    const data = await res.json();
    return (data.Items ?? []).map((item: any) => ({
      ...item,
      posterUrl: `${PUBLIC}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}&fillWidth=200&quality=85`,
    }));
  } catch (e) {
    console.error(`[Search] erreur réseau pour "${query}":`, e);
    return [];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q } = await searchParams;
  const [libraries, results] = await Promise.all([
    getUserLibraries(session.userId),
    q ? searchItems(q, session.userId, session.token) : Promise.resolve([]),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} session={session} />

      <main style={{ paddingTop: "calc(var(--jw-nav-height) + 32px)", paddingLeft: 48, paddingRight: 48, paddingBottom: 80 }}>
        {/* Barre de recherche */}
        <form method="GET" action="/search" style={{ marginBottom: 40 }}>
          <div style={{ position: "relative", maxWidth: 600 }}>
            <svg style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--jw-text-3)", pointerEvents: "none" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              name="q"
              defaultValue={q ?? ""}
              autoFocus
              placeholder="Rechercher un film, une série…"
              style={{
                width: "100%", padding: "14px 16px 14px 48px",
                background: "var(--jw-card)", border: "1px solid var(--jw-border)",
                borderRadius: "var(--jw-r-lg)", fontSize: 16,
                color: "var(--jw-text-1)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </form>

        {/* Résultats */}
        {q && (
          <>
            <p style={{ fontSize: 13, color: "var(--jw-text-3)", marginBottom: 24 }}>
              {results.length} résultat{results.length !== 1 ? "s" : ""} pour « {q} »
            </p>
            {results.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 60, color: "var(--jw-text-3)" }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
                <p>Aucun résultat trouvé</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 20 }}>
                {results.map((item: any) => (
                  <Link key={item.Id} href={`/item/${item.Id}`} style={{ display: "block" }}>
                    <div style={{
                      borderRadius: "var(--jw-r-card)", overflow: "hidden",
                      border: "1px solid var(--jw-border)", marginBottom: 8,
                      background: "var(--jw-card)",
                      transition: "border-color 0.2s, transform 0.2s",
                    }}>
                      <img src={item.posterUrl} alt={item.Name}
                        style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--jw-text-1)", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.Name}</p>
                    <p style={{ fontSize: 11, color: "var(--jw-text-3)", margin: 0 }}>{item.ProductionYear} · {item.Type === "Series" ? "Série" : "Film"}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {!q && (
          <div style={{ textAlign: "center", paddingTop: 80, color: "var(--jw-text-3)" }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🎬</p>
            <p style={{ fontSize: 16 }}>Commencez à taper pour rechercher</p>
          </div>
        )}
      </main>
    </div>
  );
}
