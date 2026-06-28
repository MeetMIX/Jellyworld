import React from 'react';
import Link from 'next/link';

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
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${libraryId}&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags&Limit=250`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch { return []; }
}

interface PageProps {
  params: { libraryId: string };
}

export default async function LibraryPage({ params }: PageProps) {
  const libraryId = params?.libraryId;

  const userId = await getFirstUserId();
  if (!userId) return <div className="text-white p-8">Backend Inaccessible</div>;

  const libraries = await getUserLibraries(userId);
  const currentLibrary = libraries.find((lib: any) => lib.Id === libraryId);
  const items = await getLibraryDetails(libraryId, userId);

  const activeLibraries = libraries.filter((lib: any) => lib.CollectionType !== "boxsets");

  return (
    <div className="min-h-screen w-screen bg-[#060609] text-[#f1f5f9] font-sans overflow-x-hidden relative pt-24">
      
      {/* 🧭 NAVIGATION SUPÉRIEURE MUTUALISÉE */}
      <header className="h-20 px-6 md:px-12 flex items-center justify-between bg-[#060609]/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="JellyWorld Logo" className="h-9 w-auto object-contain" />
          </Link>

          <nav className="hidden xl:flex items-center gap-6 text-[13px] font-medium text-zinc-400">
            {activeLibraries.map((lib: any) => (
              <Link key={lib.Id} href={`/${lib.Id}`} className={`hover:text-white transition-colors tracking-wide ${lib.Id === libraryId ? 'text-purple-400 font-bold' : ''}`}>
                {lib.Name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6 text-zinc-400">
          <Link href="/" className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider bg-white/5 px-4 py-2 rounded-xl border border-white/5 transition-all">
            ← Retour à l'accueil
          </Link>
        </div>
      </header>

      {/* 🏛️ CORPS DE GRILLE MULTI-COLONNES */}
      <div className="px-6 md:px-12 pb-24 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-base font-black text-white tracking-widest uppercase">
            {currentLibrary?.Name || "Collection"}
          </h2>
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            {items.length} éléments trouvés
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-zinc-500 text-xs py-32 font-medium">
            Aucun média trouvé dans cette catégorie.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-6">
            {items.map((item: any) => {
              const hasImage = item.ImageTags && item.ImageTags.Primary;
              const imageUrl = hasImage 
                ? `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${JELLYFIN_TOKEN}`
                : null;

              return (
                <div key={item.Id} className="group cursor-pointer flex flex-col">
                  <div className="aspect-[2/3] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900 group-hover:border-purple-500/50 transition-all duration-300 shadow-md group-hover:-translate-y-1">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] font-bold uppercase">🎬 {item.Type || "Média"}</div>
                    )}
                  </div>
                  <p className="mt-3 text-[11px] font-bold truncate text-zinc-400 group-hover:text-white transition-colors text-left pl-1">
                    {item.Name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}