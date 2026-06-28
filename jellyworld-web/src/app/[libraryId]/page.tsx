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
    return (data.Items || []).filter((lib: any) => lib.CollectionType !== "boxsets");
  } catch { return []; }
}

async function getLibraryDetails(libraryId: string, userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${libraryId}&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags&Limit=100`;
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

  const [libraries, items] = await Promise.all([
    getUserLibraries(userId),
    getLibraryDetails(libraryId, userId)
  ]);

  const currentLibrary = libraries.find((lib: any) => lib.Id === libraryId);

  return (
    <div className="min-h-screen w-screen bg-[#07060b] text-[#f1f5f9] font-sans overflow-x-hidden relative pt-28">
      
      {/* 🧭 NAV SUPÉRIEURE IDENTIQUE A L'ACCUEIL */}
      <header className="h-24 px-6 md:px-12 flex items-center justify-between bg-[#07060b]/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-12 overflow-x-auto scrollbar-none">
          <Link href="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt="JellyWorld" className="h-16 md:h-20 w-auto object-contain" />
          </Link>

          <nav className="flex items-center gap-6 md:gap-8 text-[14px] font-medium text-zinc-400 whitespace-nowrap">
            {libraries.map((lib: any) => (
              <Link key={lib.Id} href={`/${lib.Id}`} className={`hover:text-white transition-colors duration-200 ${lib.Id === libraryId ? 'text-purple-400 font-bold' : ''}`}>
                {lib.Name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center shrink-0 ml-4">
          <Link href="/" className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            ← Accueil
          </Link>
        </div>
      </header>

      {/* 🏛️ GRILLE DE CONTENUS */}
      <div className="px-6 md:px-12 pb-24 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xs font-black text-white tracking-widest uppercase">
            {currentLibrary?.Name || "Contenu"}
          </h2>
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            {items.length} éléments
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
          {items.map((item: any) => {
            const imageUrl = `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${JELLYFIN_TOKEN}`;
            return (
              <div key={item.Id} className="group cursor-pointer flex flex-col">
                <div className="aspect-[2/3] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900 group-hover:border-purple-500/50 transition-all duration-300 shadow-md">
                  <img src={imageUrl} alt={item.Name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                </div>
                <p className="mt-2 text-[11px] font-bold truncate text-zinc-400 group-hover:text-white text-left pl-1">
                  {item.Name}
                </p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}