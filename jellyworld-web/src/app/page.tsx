import React from 'react';
import Sidebar from './Sidebar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const JELLYFIN_URL = "http://192.168.220.148:8096";
const JELLYFIN_TOKEN = "0111461657f84b4384c8fe7afe4a50de";

async function getFirstUserId() {
  const url = `${JELLYFIN_URL}/Users`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const users = await res.json();
    return users[0]?.Id || null;
  } catch (error) {
    return null;
  }
}

async function getUserLibraries(userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch (error) {
    return [];
  }
}

async function getMoviesByLibrary(parentId: string, userId: string) {
  // On limite à 10 sur l'accueil pour que ça charge instantanément
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags&Limit=10`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    return (data.Items || []).map((item: any) => ({
      ...item,
      computedImageUrl: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${JELLYFIN_TOKEN}`
    }));
  } catch (error) {
    return [];
  }
}

export default async function Home() {
  const userId = await getFirstUserId();
  if (!userId) return <div className="text-white p-8">Backend Jellyfin Introuvable</div>;

  const libraries = await getUserLibraries(userId);
  const librariesWithMovies = await Promise.all(
    libraries.map(async (lib: any) => {
      const movies = await getMoviesByLibrary(lib.Id, userId);
      return { id: lib.Id, name: lib.Name, movies: movies };
    })
  );

  const activeLibraries = librariesWithMovies.filter(lib => lib.movies.length > 0);

  return (
    <div className="h-screen w-screen bg-[#07070a] text-[#f1f5f9] flex overflow-hidden">
      <Sidebar activeLibraries={activeLibraries} />

      <div className="flex-1 pl-64 h-full overflow-y-auto flex flex-col">
        <header className="h-16 px-8 flex items-center justify-between bg-[#07070a]/90 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-30 shrink-0">
          <h1 className="text-xs font-black tracking-widest text-zinc-400 uppercase">Tableau de bord</h1>
        </header>

        <div className="p-8 lg:p-10 space-y-12 flex-1">
          {activeLibraries.map((lib) => (
            <section key={lib.id} className="space-y-4 text-left">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-black text-white tracking-wider uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                  {lib.name}
                </h2>
                <Link href={`/${lib.id}`} className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider">
                  Voir tout →
                </Link>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {lib.movies.map((movie: any) => (
                  <div key={movie.Id} className="w-[130px] shrink-0 group cursor-pointer">
                    <div className="aspect-[2/3] w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-900/80 group-hover:border-purple-500/50 transition-all duration-300">
                      {movie.ImageTags?.Primary ? (
                        <img src={movie.computedImageUrl} alt={movie.Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] font-bold">🎬 NO IMAGE</div>
                      )}
                    </div>
                    <p className="mt-2 text-[10px] font-bold truncate text-zinc-400 group-hover:text-white transition-colors">{movie.Name}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}