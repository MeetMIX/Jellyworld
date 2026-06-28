import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const JELLYFIN_URL = "http://192.168.220.148:8096";
const JELLYFIN_TOKEN = "0111461657f84b4384c8fe7afe4a50de";

async function getFirstUserId() {
  const url = `${JELLYFIN_URL}/Users`;
  try {
    const res = await fetch(url, { 
      method: 'GET', 
      headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, 
      cache: 'no-store' 
    });
    if (!res.ok) return null;
    const users = await res.json();
    return users[0]?.Id || null;
  } catch { return null; }
}

async function getUserLibraries(userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, { 
      method: 'GET', 
      headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, 
      cache: 'no-store' 
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items || []).filter((lib: any) => lib.CollectionType !== "boxsets");
  } catch { return []; }
}

async function getMoviesByLibrary(parentId: string, userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${parentId}&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,Overview&Limit=14`;
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
      computedImageUrl: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${JELLYFIN_TOKEN}`,
      backdropUrl: `${JELLYFIN_URL}/Items/${item.Id}/Images/Backdrop?api_key=${JELLYFIN_TOKEN}`
    }));
  } catch { return []; }
}

export default async function Home() {
  const userId = await getFirstUserId();
  if (!userId) return <div className="text-white p-8">Backend Jellyfin Introuvable</div>;

  const libraries = await getUserLibraries(userId);
  const librariesWithMovies = await Promise.all(
    libraries.map(async (lib: any) => {
      const movies = await getMoviesByLibrary(lib.Id, userId);
      return { Id: lib.Id, Name: lib.Name, movies: movies };
    })
  );

  const activeLibraries = librariesWithMovies.filter(lib => lib.movies.length > 0);
  const heroMovie = activeLibraries[0]?.movies[0];

  return (
    <div className="min-h-screen w-full bg-[#07060b] text-[#f1f5f9] relative antialiased">
      
      {/* 🧭 NAVIGATION */}
      <header className="h-24 px-6 md:px-12 flex items-center justify-between bg-black/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-12">
          <Link href="/" className="block shrink-0">
            {/* Logo agrandi ici : h-16 et max-w-[220px] */}
            <img 
              src="/logo.png" 
              alt="JellyWorld" 
              className="h-300 w-auto max-w-[220px] object-contain block transition-transform duration-300 hover:scale-102" 
            />
          </Link>

          <nav className="flex items-center gap-6 text-[14px] font-medium text-zinc-300 relative z-50">
            {libraries.map((lib: any) => (
              <Link 
                key={lib.Id} 
                href={`/${lib.Id}`} 
                className="cursor-pointer text-zinc-400 hover:text-white font-semibold transition-colors duration-200"
              >
                {lib.Name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
          A
        </div>
      </header>

      {/* 🎬 HERO BANNER */}
      {heroMovie && (
        <section className="relative h-[80vh] w-full flex items-center px-6 md:px-12 overflow-hidden pt-24">
          <div className="absolute inset-0 z-0">
            <img 
              src={heroMovie.backdropUrl || heroMovie.computedImageUrl} 
              alt={heroMovie.Name} 
              className="w-full h-full object-cover filter brightness-[0.4] contrast-[1.05]" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07060b] via-[#07060b]/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07060b] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-4 text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-md border border-purple-500/20 inline-block">
              À la une sur JellyWorld
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase m-0">
              {heroMovie.Name}
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 line-clamp-3 max-w-xl m-0 leading-relaxed">
              {heroMovie.Overview || "Aucune description disponible."}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider shadow-lg shadow-purple-600/20 cursor-pointer">
                ▶ Regarder Maintenant
              </button>
              <button className="bg-white/10 text-white font-bold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider border border-white/5 backdrop-blur-md cursor-pointer">
                ℹ️ Détails
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 🗂️ LES RAILS HORIZONTAUX */}
      <div className="px-6 md:px-12 pb-24 space-y-12 relative z-20 -mt-12">
        {activeLibraries.map((lib) => (
          <section key={lib.Id} className="space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-bold text-white tracking-widest uppercase m-0">{lib.Name}</h3>
              <Link href={`/${lib.Id}`} className="text-[11px] font-bold text-purple-400 hover:text-purple-300 uppercase no-underline">Voir tout →</Link>
            </div>
            
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
              {lib.movies.map((movie: any) => (
                <div key={movie.Id} className="w-[140px] md:w-[170px] shrink-0 group cursor-pointer">
                  <div className="aspect-[2/3] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900 group-hover:border-purple-500/60 transition-all duration-300 shadow-lg">
                    <img src={movie.computedImageUrl} alt={movie.Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <p className="mt-2 text-[11px] font-bold truncate text-zinc-400 group-hover:text-white pl-1 m-0">{movie.Name}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}