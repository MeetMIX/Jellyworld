import Link from "next/link";
import { getAllItemsByLibrary, getFirstUserId, getUserLibraries } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";
import MovieCard from "@/components/MovieCard/MovieCard";

export const dynamic = "force-dynamic";

// Next.js 15+ : params est une Promise
export default async function LibraryPage({
  params,
}: {
  params: Promise<{ libraryId: string }>;
}) {
  const { libraryId } = await params; // ✅ FIX

  const userId = await getFirstUserId();
  const [libraries, items] = await Promise.all([
    userId ? getUserLibraries(userId) : Promise.resolve([]),
    userId ? getAllItemsByLibrary(libraryId, userId) : Promise.resolve([]),
  ]);
  const currentLib = libraries.find((l) => l.Id === libraryId);

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
            <p style={{ fontSize: 11, color: "var(--jw-text-3)", marginTop: 8, fontFamily: "monospace" }}>
              libraryId: {libraryId} · userId: {userId ?? "null"}
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 20,
          }}>
            {items.map((item) => (
              <MovieCard key={item.Id} item={item} variant="poster" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
