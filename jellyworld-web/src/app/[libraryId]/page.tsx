import Link from "next/link";
import { getAllItemsByLibrary, getFirstUserId, getUserLibraries } from "@/lib/jellyfin";
import NavBar from "@/components/NavBar/NavBar";
import MovieCard from "@/components/MovieCard/MovieCard";

export const dynamic = "force-dynamic";

interface LibraryPageProps {
  params: { libraryId: string };
}

export default async function LibraryPage({ params }: LibraryPageProps) {
  const userId = await getFirstUserId();
  const libraries = userId ? await getUserLibraries(userId) : [];
  const items = await getAllItemsByLibrary(params.libraryId);

  const currentLib = libraries.find((l) => l.Id === params.libraryId);
  const title = currentLib?.Name ?? "Collection";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--jw-bg)",
        color: "var(--jw-text-1)",
      }}
    >
      <NavBar libraries={libraries} />

      <main
        style={{
          paddingTop: "calc(var(--jw-nav-height) + 40px)",
          padding: `calc(var(--jw-nav-height) + 40px) var(--jw-page-px) 80px`,
        }}
      >
        {/* En-tête page */}
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--jw-purple)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 20,
            }}
          >
            ← Accueil
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--jw-border-subtle)",
              paddingBottom: 14,
            }}
          >
            <h1
              style={{
                fontSize: 22,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: 0,
              }}
            >
              {title}
            </h1>
            <span style={{ fontSize: 12, color: "var(--jw-text-3)" }}>
              {items.length} éléments
            </span>
          </div>
        </div>

        {/* Grille */}
        {items.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--jw-text-3)" }}>
            Aucun média trouvé dans cette catégorie.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 20,
            }}
          >
            {items.map((item) => (
              <MovieCard key={item.Id} item={item} variant="poster" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
