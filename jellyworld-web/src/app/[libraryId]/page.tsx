import Link from "next/link";
import { getAllItemsByLibrary, getFirstUserId, getUserLibraries } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";
import MovieCard from "@/components/MovieCard/MovieCard";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ libraryId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { libraryId } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(0, parseInt(pageStr ?? "0", 10));
  const pageSize = 100;

  const userId = await getFirstUserId();
  const [libraries, { items, total }] = await Promise.all([
    userId ? getUserLibraries(userId) : Promise.resolve([]),
    userId
      ? getAllItemsByLibrary(libraryId, userId, page, pageSize)
      : Promise.resolve({ items: [], total: 0 }),
  ]);

  const currentLib = libraries.find((l) => l.Id === libraryId);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} />
      <main style={{ paddingTop: "112px", paddingLeft: "48px", paddingRight: "48px", paddingBottom: "80px" }}>

        {/* En-tête */}
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
            <span style={{ fontSize: 12, color: "var(--jw-text-3)" }}>
              {total} éléments
              {totalPages > 1 && ` · Page ${page + 1}/${totalPages}`}
            </span>
          </div>
        </div>

        {/* Grille */}
        {items.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--jw-text-3)", paddingTop: 40 }}>Aucun média trouvé.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 20 }}>
            {items.map((item) => (
              <MovieCard key={item.Id} item={item} variant="poster" />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, marginTop: 48,
          }}>
            {page > 0 && (
              <Link href={`/${libraryId}?page=${page - 1}`} style={{
                padding: "8px 20px", borderRadius: "var(--jw-r-md)",
                background: "var(--jw-card)", border: "1px solid var(--jw-border)",
                fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)",
              }}>← Précédent</Link>
            )}
            {/* Pages autour de la page courante */}
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => Math.abs(i - page) <= 2)
              .map(i => (
                <Link key={i} href={`/${libraryId}?page=${i}`} style={{
                  width: 36, height: 36, borderRadius: "var(--jw-r-md)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: i === page ? 700 : 500,
                  background: i === page ? "var(--jw-gradient)" : "var(--jw-card)",
                  border: `1px solid ${i === page ? "transparent" : "var(--jw-border)"}`,
                  color: "#fff",
                }}>{i + 1}</Link>
              ))
            }
            {page < totalPages - 1 && (
              <Link href={`/${libraryId}?page=${page + 1}`} style={{
                padding: "8px 20px", borderRadius: "var(--jw-r-md)",
                background: "var(--jw-card)", border: "1px solid var(--jw-border)",
                fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)",
              }}>Suivant →</Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
