import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const JELLYFIN_URL = "http://192.168.220.148:8096";
const JELLYFIN_TOKEN = "0111461657f84b4384c8fe7afe4a50de";

async function getMoviesByLibrary(parentId: string) {
  const url = `${JELLYFIN_URL}/Items?ParentId=${parentId}&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,Overview`;
  try {
    const res = await fetch(url, { 
      method: 'GET', 
      headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, 
      cache: 'no-store' 
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items || []).map((item: any) => ({
      ...item,
      computedImageUrl: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${JELLYFIN_TOKEN}`
    }));
  } catch { return []; }
}

export default async function LibraryPage({ params }: { params: { libraryId: string } }) {
  const movies = await getMoviesByLibrary(params.libraryId);

  return (
    <div className="min-h-screen w-full bg-[#07060b] text-[#f1f5f9] pt-28 px-6 md:px-12">
      <div className="mb-6">
        <Link href="/" className="text-xs font-bold text-purple-400 hover:underline">
          ← Retour à l'accueil
        </Link>
      </div>
      
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8 border-b border-white/5 pb-4">
        Collection — {movies.length} Éléments
      </h1>

      {movies.length === 0 ? (
        <p className="text-zinc-500 text-sm">Aucun média trouvé dans cette catégorie.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-6">
          {movies.map((movie: any) => (
            <div key={movie.Id} className="group cursor-pointer">
              <div className="aspect-[2/3] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900 group-hover:border-purple-500/60 transition-all duration-300 shadow-lg">
                <img src={movie.computedImageUrl} alt={movie.Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <p className="mt-2 text-[11px] font-bold truncate text-zinc-400 group-hover:text-white pl-1">{movie.Name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}