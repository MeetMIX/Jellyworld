import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserLibraries, getFirstUserId, getItemById } from "@/lib/jellyfin";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar/NavBar";
import SortBar from "@/components/Library/SortBar";
import LibraryGrid from "@/components/Library/LibraryGrid";

export const dynamic = "force-dynamic";

type SortField = "SortName" | "PremiereDate" | "DateCreated" | "CommunityRating";
type SortDir = "Ascending" | "Descending";

async function fetchItems(
  parentId: string, userId: string, token: string,
  sort: SortField, dir: SortDir, page: number, pageSize: number,
  isCollections: boolean
) {
  const INTERNAL = process.env.JELLYFIN_INTERNAL_URL || "http://jellyfin-backend:8096";
  const PUBLIC   = process.env.NEXT_PUBLIC_JELLYFIN_URL || "http://192.168.220.148:8096";
  const API_KEY  = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "";

  // La bibliothèque automatique "Collections" (CollectionType=boxsets) ne
  // contient que des BoxSet — absent des autres bibliothèques, qui utilisent
  // Movie/Series/etc et n'incluent jamais BoxSet dans leur propre requête.
  const includeTypes = isCollections ? "BoxSet" : "Movie,Series,MusicVideo,Video";

  const url = `${INTERNAL}/Users/${userId}/Items`
    + `?ParentId=${parentId}&Recursive=true`
    + `&IncludeItemTypes=${includeTypes}`
    // Champs minimaux pour la grille — réduit la réponse de 80%
    + `&Fields=PrimaryImageAspectRatio,ImageTags,PremiereDate,UserData`
    + `&SortBy=${sort}&SortOrder=${dir}`
    + `&Limit=${pageSize}&StartIndex=${page * pageSize}`;

  const res = await fetch(url, {
    headers: { Authorization: `MediaBrowser Token="${token}"` },
    next: { revalidate: 300 }, // cache 5 min — évite les 3min de chargement
  });

  if (!res.ok) return { items: [], total: 0 };
  const data = await res.json();

  return {
    total: data.TotalRecordCount ?? 0,
    items: (data.Items ?? []).map((item: any) => ({
      Id: item.Id, Name: item.Name, Type: item.Type,
      ProductionYear: item.ProductionYear,
      CommunityRating: item.CommunityRating,
      PremiereDate: item.PremiereDate,
      DateCreated: item.DateCreated,
      UserData: item.UserData,
      posterUrl: `${PUBLIC}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}&fillWidth=280&quality=85`,
    })),
  };
}

export default async function LibraryPage({
  params, searchParams,
}: {
  params: Promise<{ libraryId: string }>;
  searchParams: Promise<{ sort?: string; dir?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { libraryId } = await params;
  const { sort, dir, page: pageStr } = await searchParams;

  const sortField = (sort as SortField) || "SortName";
  const sortDir   = (dir as SortDir)   || "Ascending";
  const page      = Math.max(0, parseInt(pageStr ?? "0", 10));
  const pageSize  = 100;

  // Les bibliothèques doivent être connues avant de requêter les items : le
  // type de contenu à demander (Movie/Series vs BoxSet) dépend du
  // CollectionType de la bibliothèque courante ("Collections" ou classique).
  const libraries = await getUserLibraries(session.userId);
  const currentLib = libraries.find(l => l.Id === libraryId);
  const isCollections = currentLib?.CollectionType === "boxsets";
  const { items, total } = await fetchItems(
    libraryId, session.userId, session.token, sortField, sortDir, page, pageSize, isCollections
  );
  const totalPages = Math.ceil(total / pageSize);

  // Cas d'une collection précise (BoxSet cliqué depuis la bibliothèque
  // "Collections") : ce n'est pas une bibliothèque top-level, donc absente de
  // `libraries` — on va chercher son vrai nom pour le titre de la page.
  const collectionItem = !currentLib ? await getItemById(libraryId, session.userId) : null;
  const pageTitle = currentLib?.Name ?? collectionItem?.Name ?? "Collection";

  return (
    <div style={{ minHeight: "100vh", background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
      <NavBar libraries={libraries} session={session} />
      <main style={{ padding: "calc(var(--jw-nav-height) + 32px) 40px 80px" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
            {pageTitle}
          </h1>
        </div>

        <SortBar libraryId={libraryId} total={total} currentSort={sortField} currentDir={sortDir} />

        <LibraryGrid items={items} libraryId={libraryId} />

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 48 }}>
            {page > 0 && (
              <Link href={`/${libraryId}?sort=${sortField}&dir=${sortDir}&page=${page - 1}`}
                style={{ padding: "8px 20px", borderRadius: 8, background: "var(--jw-card)", border: "1px solid var(--jw-border)", fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)" }}>
                ← Précédent
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => Math.abs(i - page) <= 2)
              .map(i => (
                <Link key={i} href={`/${libraryId}?sort=${sortField}&dir=${sortDir}&page=${i}`}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: i === page ? 700 : 500,
                    background: i === page ? "linear-gradient(110deg,#6B2FD9,#E03050)" : "var(--jw-card)",
                    border: `1px solid ${i === page ? "transparent" : "var(--jw-border)"}`,
                    color: "#fff",
                  }}>{i + 1}</Link>
              ))
            }
            {page < totalPages - 1 && (
              <Link href={`/${libraryId}?sort=${sortField}&dir=${sortDir}&page=${page + 1}`}
                style={{ padding: "8px 20px", borderRadius: 8, background: "var(--jw-card)", border: "1px solid var(--jw-border)", fontSize: 13, fontWeight: 600, color: "var(--jw-text-1)" }}>
                Suivant →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
