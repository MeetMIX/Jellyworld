import Link from "next/link";
import { getFirstUserId, getUserLibraries } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";
import MovieCard from "@/components/MovieCard/MovieCard";

export const dynamic = "force-dynamic";

// Fonction de debug directe — bypass getAllItemsByLibrary pour voir ce que retourne l'API
async function fetchLibraryItems(parentId: string, userId: string) {
  const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
  const TOKEN    = process.env.JELLYFIN_API_KEY || "";

  const headers = {
    Authorization: `MediaBrowser Token="${TOKEN}"`,
    Accept: "application/json",
  };

  // Essai 1 : avec userId dans le path (méthode recommandée)
  const url1 = `${INTERNAL}/Users/${userId}/Items?ParentId=${parentId}&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks&SortBy=SortName&SortOrder=Ascending`;
  
  try {
    const res = await fetch(url1, { method: "GET", headers, cache: "no-store" });
    const data = await res.json();
    const count = data?.Items?.length ?? 0;
    console.log(`[LibraryPage] userId=${userId} parentId=${parentId} → ${count} items (status ${res.status})`);
    
    if (count > 0) {
      const PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
      return (data.Items as any[]).map((item: any) => ({
        ...item,
        posterUrl: `${PUBLIC}/Items/${item.Id}/Images/Primary?api_key=${TOKEN}&fillWidth=300&quality=90`,
        backdropUrl: `${PUBLIC}/Items/${item.Id}/Images/Backdrop?api_key=${TOKEN}&fillWidth=1280&quality=85`,
      }));
    }

    // Essai 2 : sans userId si essai 1 retourne 0
    const url2 = `${INTERNAL}/Items?ParentId=${parentId}&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,Overview,RunTimeTicks&SortBy=SortName&SortOrder=Ascending`;
    const res2 = await fetch(url2, { method: "GET", headers, cache: "no-store" });
    const data2 = await res2.json();
    const count2 = data2?.Items?.length ?? 0;
    console.log(`[LibraryPage] Fallback sans userId → ${count2} items (status ${res2.status})`);

    const PUBLIC = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
    return (data2.Items ?? []).map((item: any) => ({
      ...item,
      posterUrl: `${PUBLIC}/Items/${item.Id}/Images/Primary?api_key=${TOKEN}&fillWidth=300&quality=90`,
      backdropUrl: `${PUBLIC}/Items/${item.Id}/Images/Backdrop?api_key=${TOKEN}&fillWidth=1280&quality=85`,
    }));
  } catch (e) {
    console.error("[LibraryPage] Erreur fetch:", e);
    return [];
  }
}

export default async function LibraryPage({ params }: { params: { libraryId: string } }) {
  const userId = await getFirstUserId();
  const libraries = userId ? await getUserLibraries(userId) : [];
  const items = userId ? await fetchLibraryItems(params.libraryId, userId) : [];
  const currentLib = libraries.find((l) => l.Id === params.libraryId);

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} />
      <main style={{ paddingTop: "112px", paddingLeft: "48px", paddingRight: "48px", paddingBottom: "80px" }}>
        
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{
            fontSize: 11, fontWeight: 700, color: "var(--jw-purple)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            display: "inline-block", marginBottom: 20,
          }}>← Accueil</Link>

          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 14,
          }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              {currentLib?.Name ?? "Collection"}
            </h1>
            <span style={{ fontSize: 12, color: "var(--jw-text-3)" }}>{items.length} éléments</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ paddingTop: 60, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--jw-text-2)" }}>Aucun média trouvé.</p>
            <p style={{ fontSize: 11, color: "var(--jw-text-3)", marginTop: 8 }}>
              libraryId: <code style={{ color: "#A06EF0" }}>{params.libraryId}</code>
              {" · "} userId: <code style={{ color: "#A06EF0" }}>{userId ?? "null"}</code>
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 20,
          }}>
            {items.map((item: any) => (
              <MovieCard key={item.Id} item={item} variant="poster" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
