import React from 'react';
import Sidebar from '../Sidebar';

export const dynamic = 'force-dynamic';

const JELLYFIN_URL = "http://192.168.220.148:8096";
const JELLYFIN_TOKEN = "0111461657f84b4384c8fe7afe4a50de";

async function getFirstUserId() {
  const url = `${JELLYFIN_URL}/Users`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return null;
    const users = await res.json();
    return users[0]?.Id || null;
  } catch { return null; }
}

async function getUserLibraries(userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch { return []; }
}

async function getLibraryDetails(libraryId: string, userId: string) {
  // On accepte les Movies ET les Series/Episodes/CollectionFolders pour éviter les grilles vides selon la catégorie
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${libraryId}&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags&Limit=100`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch { return []; }
}

interface PageProps {
  params: Promise<{ libraryId: string }> | { libraryId: string };
}

export default async function LibraryPage(props: PageProps) {
  // Résolution propre des params pour éviter le crash/404 Next.js
  const resolvedParams = 'then' in props.params ? await props.params : props.params;
  const libraryId = resolvedParams.libraryId;

  const userId = await getFirstUserId();
  if (!userId) return <div className="text-white p-8">Backend Inaccessible</div>;

  const libraries = await getUserLibraries(userId);
  const currentLibrary = libraries.find((lib: any) => lib.Id === libraryId);
  const movies = await getLibraryDetails(libraryId, userId);

  // Filtrage pour la Sidebar
  const activeLibraries = libraries.filter((lib: any) => lib.CollectionType !== "boxsets");

  return (
    <div className="h-screen w-screen bg-[#07070a] text-[#f1f5f9] flex overflow-hidden">
      <Sidebar activeLibraries={activeLibraries} />

      <div className="flex-1 pl-64 h-full overflow-y-auto flex flex-col">
        <header className="h-16 px-8 flex items-center justify-between bg-[#07070a]/90 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-30 shrink-0">
          <h1 className="text-xs font-black tracking-widest text-white uppercase">
            {currentLibrary?.Name || "Collection"} — {movies.length} Éléments
          </h1>
        </header>

        <div className="p-8 lg:p-10 flex-1">
          {movies.length === 0 ? (
            <div className="text-center text-zinc-500 text-xs py-20 font-medium">
              Aucun média trouvé dans cette collection.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-6">
              {movies.map((movie: any) => {
                const imageUrl = `${JELLYFIN_URL}/Items/${movie.Id}/Images/Primary?api_key=${JELLYFIN_TOKEN}`;
                return (
                  <div key={movie.Id} className="group cursor-pointer flex flex-col">
                    <div className="aspect-[2/3] w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-900/80 group-hover:border-purple-500/50 transition-all duration-300 shadow-md">
                      {movie.ImageTags?.Primary ? (
                        <img src={imageUrl} alt={movie.Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] font-bold">🎬 NO IMAGE</div>
                      )}
                    </div>
                    <p className="mt-2 text-[10px] font-bold truncate text-zinc-400 group-hover:text-white transition-colors text-left">{movie.Name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}