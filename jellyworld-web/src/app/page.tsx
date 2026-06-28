import React from 'react';
import Sidebar from './Sidebar';

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
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,ProductionYear,UserData&Limit=40`;
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

function MovieListRenderer({ activeLibraries }: { activeLibraries: any[] }) {
  return (
    <main className="space-y-12">
      {activeLibraries.map((lib) => (
        <section key={lib.id} id={`lib-${lib.id}`} className="space-y-4 text-left scroll-mt-24">
          <h2 className="text-sm font-black text-white tracking-wider uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            {lib.name}
          </h2>

          <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {lib.movies.map((movie: any) => (
              <div key={movie.Id} className="w-[140px] shrink-0 group cursor-pointer">
                <div className="aspect-[2/3] w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-900/80 group-hover:border-purple-500/50 transition-all duration-300 shadow-md">
                  {movie.ImageTags?.Primary ? (
                    <img 
                      src={movie.computedImageUrl} 
                      alt={movie.Name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] bg-zinc-950 font-bold">
                      🎬 NO IMAGE
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[11px] font-bold truncate text-zinc-400 group-hover:text-white transition-colors">
                  {movie.Name}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export default async function Home() {
  const userId = await getFirstUserId();
  
  if (!userId) {
    return (
      <div className="h-screen w-screen bg-[#07070a] text-white flex flex-col items-center justify-center gap-2">
        <p className="text-sm font-bold text-red-500">Erreur : L'application n'arrive pas à joindre Jellyfin.</p>
        <p className="text-xs text-zinc-500">Adresse tentée : {JELLYFIN_URL}</p>
      </div>
    );
  }

  const libraries = await getUserLibraries(userId);
  const librariesWithMovies = await Promise.all(
    libraries.map(async (lib: any) => {
      const movies = await getMoviesByLibrary(lib.Id, userId);
      return { id: lib.Id, name: lib.Name, movies: movies };
    })
  );

  const activeLibraries = librariesWithMovies.filter(lib => lib.movies.length > 0);

  return (
    <div className="min-h-screen bg-[#07070a] text-[#f1f5f9] flex">
      
      {/* 👈 MENU LATÉRAL INTELLIGENT (S'affiche à gauche de manière statique et isolée) */}
      <Sidebar activeLibraries={activeLibraries} />

      {/* 👉 ZONE DE CONTENU CENTRAL (Décalée de 64 unités pour laisser la place au menu) */}
      <div className="flex-1 pl-64 min-h-screen flex flex-col">
        
        {/* Topbar supérieure */}
        <header className="h-16 px-8 flex items-center justify-between bg-[#07070a]/80 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-30">
          <div className="relative w-72">
            <input 
              type="text" 
              placeholder="Rechercher un film, une série..." 
              className="w-full bg-zinc-900/40 border border-zinc-900 rounded-lg py-1.5 px-4 text-[11px] text-zinc-300 focus:outline-none focus:border-purple-500/40 transition-all" 
            />
          </div>
          <div className="text-zinc-500 text-[11px] font-medium tracking-wide">
            Serveur Local Actif
          </div>
        </header>

        {/* Grilles de films */}
        <div className="p-8 lg:p-10 space-y-12 flex-1 overflow-y-auto">
          <MovieListRenderer activeLibraries={activeLibraries} />
        </div>

      </div>
    </div>
  );
}